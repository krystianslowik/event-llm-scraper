// we use the top-down approach to gather DOM blocks, but also merges of elements to avoid rate limiting
// merging of smaller blocks into bigger ones (up to a certain combined size) before summarizing
// this approach avoids hit rate limit (limits below), loosing context due to too long context window (ive observed gpt lose it >20k tokens / >80k chars)
// Model	    RPM	 RPD	  TPM	      Batch Queue Limit
// gpt-4o-mini	500	 10,000	  200,000	  2,000,000
//
// We keep the two-step approach: chunk -> summarize -> extract events, with fuzzy dedup.

const { chromium } = require("playwright");
const cheerio = require("cheerio");
const OpenAI = require("openai");
const stringSimilarity = require("string-similarity");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// thresholds for top-down extraction:
const MIN_TEXT_LENGTH = 25;
const MAX_TEXT_LENGTH = 4000;

// maximum combined chunk size (characters) for merging small chunks.
const MAX_COMBINED_SIZE = 4000;

async function scrapePage(url, retries = 3) {
    console.log(`[DEBUG] Starting to scrape page: ${url}`);
    const browser = await chromium.launch({ args: ["--disable-http2"] });
    const context = await browser.newContext({
        userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`[DEBUG] Attempt ${attempt} to navigate.`);
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
            const content = await page.content();
            console.log(`[DEBUG] Successfully scraped page content.`);
            await browser.close();
            return content;
        } catch (error) {
            console.error(`[DEBUG] Error on attempt ${attempt}: ${error.message}`);
            if (attempt === retries) {
                await browser.close();
                throw new Error(`Failed to scrape ${url} after ${retries} attempts: ${error.message}`);
            }
        }
    }
}

 // BFS from <body>. If a node is within [MIN_TEXT_LENGTH..MAX_TEXT_LENGTH], we accept it, else we traverse children. If it has < MIN_TEXT_LENGTH or 0 links, we skip it but still traverse its children.
function gatherCandidateNodes($, root) {
    const queue = [root];
    const results = [];

    while (queue.length) {
        const node = queue.shift();
        if (!node) continue;

        const el = $(node);
        const text = el.text().replace(/\s+/g, " ").trim();
        const linkCount = el.find("a[href]").filter((_, a) => $(a).attr("href") !== "#").length;
        const length = text.length;

        // skip or descend if too small or no links
        if (length < MIN_TEXT_LENGTH || linkCount === 0) {
            const children = el.children().get();
            queue.push(...children);
            continue;
        }

        if (length <= MAX_TEXT_LENGTH) {
            results.push(node);
        } else {
            // too big => traverse children
            const children = el.children().get();
            queue.push(...children);
        }
    }
    return results;
}


 // DOM node to chunk text, including found links
function nodeToChunk($, node) {
    const el = $(node);
    const text = el.text().replace(/\s+/g, " ").trim();
    const links = [];
    el.find("a[href]").each((_, a) => {
        const href = $(a).attr("href");
        if (href && href !== "#") {
            links.push(href);
        }
    });
    let chunkText = text;
    if (links.length) {
        chunkText += `\nLinks found:\n${links.join("\n")}`;
    }
    return chunkText;
}

// smaller chunks to reduce total chunk count. If adding a chunk would exceed MAX_COMBINED_SIZE, we start a new combined chunk
function combineSmallChunks(chunks, maxSize) {
    const combined = [];
    let current = "";
    let currentSize = 0;

    for (const c of chunks) {
        const cLength = c.length;
        if (!cLength) continue;
        // if adding c surpasses the limit, push current and reset
        if (currentSize + cLength > maxSize) {
            if (current.trim()) {
                combined.push(current);
            }
            current = c;
            currentSize = cLength;
        } else {
            // else keepp merging
            if (!current) {
                current = c;
                currentSize = cLength;
            } else {
                current += "\n\n" + c;
                currentSize += cLength;
            }
        }
    }
    if (current.trim()) {
        combined.push(current);
    }
    return combined;
}

// top->down DOM, then combine chunks
function sanitizeAndChunkHtml(html) {
    console.log(`[DEBUG] Sanitizing HTML content...`);
    const $ = cheerio.load(html);
    $("script, style, meta, link, nav, footer").remove();

    const bodyEl = $("body").get(0);
    if (!bodyEl) {
        console.log("[DEBUG] No <body> found, returning fallback text.");
        return [$.text().replace(/\s+/g, " ").trim()];
    }

    const candidateNodes = gatherCandidateNodes($, bodyEl);
    console.log(`[DEBUG] Found ${candidateNodes.length} candidate nodes.`);

    // each accepted node to chunk text
    let chunks = candidateNodes.map((node) => nodeToChunk($, node)).filter(Boolean);

    if (!chunks.length) {
        const fallbackText = $.text().replace(/\s+/g, " ").trim();
        return [fallbackText];
    }

    console.log(`[DEBUG] Created ${chunks.length} initial chunks.`);
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const avgLength = (totalLength / chunks.length).toFixed(2);
    console.log(`[DEBUG] Total text length across chunks: ${totalLength} characters.`);
    console.log(`[DEBUG] Average chunk length: ${avgLength} characters.`);

    // smaller chunks into bigger ones (up to MAX_COMBINED_SIZE chars)
    chunks = combineSmallChunks(chunks, MAX_COMBINED_SIZE);
    console.log(`[DEBUG] After merging small chunks, we have ${chunks.length} combined chunks.`);

    return chunks;
}

async function summarizeChunk(chunk, sourceUrl, index, total) {
    console.log(
        `[DEBUG] Summarizing chunk ${index + 1}/${total} from ${sourceUrl} (length: ${chunk.length})`
    );

    const userPrompt = `
Please provide a concise summary of the following text. 
If you find any events, ensure the summary mentions:
- "Event Title"
- "Short Description"
- "URL" 
- "Category"
- "Date" - convert to ISO 8601
If no events, state "No events found.". Do not skip any event. Make sure all of them are taken from the text provided. No markdown. 
Response in German.
DO NOT BE LAZY. THIS IS IMPORTANT.
Here's the text:
${chunk}
`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: userPrompt }],
            temperature: 0.7,
        });
        const summary = response.choices[0].message.content.trim();
        console.log(`[DEBUG] Summary obtained (chunk ${index + 1}): ${summary}`);
        return summary;
    } catch (error) {
        console.error(`[DEBUG] Error summarizing chunk ${index + 1}: ${error.message}`);
        return "";
    }
}

// parse summary into events (1 chunk -> 1 array of events)
async function extractEventsFromSummary(summarizedText, sourceUrl) {
    console.log(`[DEBUG] Extracting events from summary for ${sourceUrl}...`);
    const userPrompt = `
You are a helpful assistant. Return the data in valid JSON (no code fences). 
Structure it exactly as:
{
  "events": [
    {
      "title": "<string>",
      "description": "<string>",
      "url": "<string>",
      "category": "<string>",
      "date": "<string>"
    }
  ]
}

Extract EVERY event details from the summary below:
- Title of the event
- Description
- URL to the details
- Category (e.g., local, education, etc.)
- Date (any recognized date format)

If there are no events, return an empty "events": [] array.
Make sure there's no unterminated json and answer contains just what I asked for. 
Make sure ALL EVENTS are taken from the text provided.
DO NOT BE LAZY. THIS IS IMPORTANT.
Source: ${sourceUrl}
Summary:
${summarizedText}
`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: userPrompt }],
            temperature: 0.2,
        });
        const content = response.choices[0].message.content;
        console.log(`[DEBUG] Raw JSON response: ${content}`);
        return JSON.parse(content);
    } catch (error) {
        console.error(`[DEBUG] Error extracting events: ${error.message}`);
        return null;
    }
}

function fuzzyDeduplicate(allEvents) {
    console.log(`[DEBUG] Starting fuzzy dedup. Total events before dedup: ${allEvents.length}`);

    const deduped = [];
    for (const ev of allEvents) {
        const titleA = (ev.title || "").toLowerCase().trim();
        const dateA = (ev.date || "").toLowerCase().trim();
        let isDuplicate = false;

        for (const existing of deduped) {
            const titleB = (existing.title || "").toLowerCase().trim();
            const dateB = (existing.date || "").toLowerCase().trim();

            // if dates match, check the similarity of the titles
            if (dateA === dateB) {
                const similarity = stringSimilarity.compareTwoStrings(titleA, titleB);
                if (similarity > 0.3) {
                    console.log(
                        `[DEBUG] Duplicate found. Skipping event:\n` +
                        `  TitleA: "${ev.title}"\n` +
                        `  TitleB: "${existing.title}"\n` +
                        `  Date: "${ev.date}"\n` +
                        `  Similarity: ${similarity.toFixed(2)}`
                    );
                    isDuplicate = true;
                    break;
                }
            }
        }

        if (!isDuplicate) {
            deduped.push(ev);
        }
    }

    console.log(`[DEBUG] Fuzzy dedup complete. Total events after dedup: ${deduped.length}`);
    return deduped;
}

async function extractEventsFromUrl(url) {
    console.log(`[DEBUG] Starting extraction for URL: ${url}`);
    const rawHtml = await scrapePage(url);
    console.log(`[DEBUG] Scraped HTML length: ${rawHtml.length}`);

    let chunks = sanitizeAndChunkHtml(rawHtml);
    console.log(`[DEBUG] Final chunk count: ${chunks.length}`);

    // summarize each chunk
    const summaryPromises = chunks.map((chunk, idx) =>
        summarizeChunk(chunk, url, idx, chunks.length)
    );
    const summaries = await Promise.all(summaryPromises);
    console.log(`[DEBUG] Completed summarizing chunks.`);

    let allEvents = [];
    for (const [i, summary] of summaries.entries()) {
        const trimmed = summary.trim();
        if (!trimmed || trimmed === "No events found.") {
            console.log(`[DEBUG] Skipping chunk ${i + 1}, it's empty or no events.`);
            continue;
        }
        console.log(`[DEBUG] Extracting events from chunk ${i + 1} summary...`);
        const result = await extractEventsFromSummary(summary, url);
        if (result && Array.isArray(result.events)) {
            allEvents.push(...result.events);
        }
    }

    allEvents = fuzzyDeduplicate(allEvents);
    console.log(`[DEBUG] Final count of events after dedup: ${allEvents.length}`);

    const categorySet = new Set();
    allEvents.forEach((ev) => {
        if (ev.category) {
            categorySet.add(ev.category.trim());
        }
    });

    return {
        events: allEvents,
        categories: Array.from(categorySet),
    };
}

module.exports = {
    extractEventsFromUrl,
};