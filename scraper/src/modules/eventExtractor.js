const { chromium } = require("playwright");
const cheerio = require("cheerio");
const OpenAI = require("openai");
const stringSimilarity = require("string-similarity");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const MIN_TEXT_LENGTH = 25;
const MAX_TEXT_LENGTH = 4000;
const MAX_COMBINED_SIZE = 4000;
const CATEGORY_SET = "Familienleben, Aktivitäten, Veranstaltungen, Essen/Rezepte, Münsterland, Kultur/Lifestyle, Gesundheit, Reisen, Einkaufen, Gemeinschaft, Tipps & Ratgeber";
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

// BFS approach from <body> with min/max text length checks
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

        if (length < MIN_TEXT_LENGTH || linkCount === 0) {
            const children = el.children().get();
            queue.push(...children);
            continue;
        }

        if (length <= MAX_TEXT_LENGTH) {
            results.push(node);
        } else {
            const children = el.children().get();
            queue.push(...children);
        }
    }
    return results;
}

/**
 * Try to convert any relative href into an absolute URL based on 'baseUrl'.
 */
function resolveHref(href, baseUrl) {
    try {
        return new URL(href, baseUrl).href;
    } catch {
        return href; // fallback
    }
}

/**
 * DOM node -> chunk text, including found links (already resolved to absolute).
 */
function nodeToChunk($, node, baseUrl) {
    const el = $(node);
    const text = el.text().replace(/\s+/g, " ").trim();
    const links = [];
    el.find("a[href]").each((_, a) => {
        const rawHref = $(a).attr("href");
        if (rawHref && rawHref !== "#") {
            // Convert to absolute
            const fullUrl = resolveHref(rawHref, baseUrl);
            links.push(fullUrl);
        }
    });

    if (!text) return "";
    let chunkText = text;
    if (links.length) {
        chunkText += `\nLinks found:\n${links.join("\n")}`;
    }
    return chunkText;
}

function combineSmallChunks(chunks, maxSize) {
    const combined = [];
    let current = "";
    let currentSize = 0;

    for (const c of chunks) {
        const cLength = c.length;
        if (!cLength) continue;
        if (currentSize + cLength > maxSize) {
            if (current.trim()) combined.push(current);
            current = c;
            currentSize = cLength;
        } else {
            if (!current) {
                current = c;
                currentSize = cLength;
            } else {
                current += "\n\n" + c;
                currentSize += cLength;
            }
        }
    }
    if (current.trim()) combined.push(current);
    return combined;
}

// sanitize, gather candidate nodes, optionally merge small chunks
function sanitizeAndChunkHtml(html, baseUrl, mergeChunks = true) {
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

    let chunks = candidateNodes
        .map((node) => nodeToChunk($, node, baseUrl))
        .filter(Boolean);

    if (!chunks.length) {
        const fallbackText = $.text().replace(/\s+/g, " ").trim();
        return [fallbackText];
    }

    console.log(`[DEBUG] Created ${chunks.length} initial chunks.`);
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const avgLength = (totalLength / chunks.length).toFixed(2);
    console.log(`[DEBUG] Total text length across chunks: ${totalLength} characters.`);
    console.log(`[DEBUG] Average chunk length: ${avgLength} characters.`);

    if (mergeChunks) {
        chunks = combineSmallChunks(chunks, MAX_COMBINED_SIZE);
        console.log(`[DEBUG] After merging small chunks, we have ${chunks.length} combined chunks.`);
    } else {
        console.log(`[DEBUG] Skipping chunk merging (mergeChunks=false). Chunk count: ${chunks.length}`);
    }

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
- "Category" - assign to one of following if possible: ${CATEGORY_SET}. If none category apply, use "Andere'
- "Date" - convert to ISO 8601. Only one date. If no year provided, use 2025.
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
- Title
- Description
- URL
- Category
- Date (any recognized date format)
If there are no events, return {"events":[]}.

Make sure there's no unterminated json, and answer only in the format requested.
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

/**
 * Final pass: If LLM returns relative links, re-resolve them with baseUrl
 */
function ensureAbsoluteEventUrls(events, baseUrl) {
    for (const ev of events) {
        if (ev.url && !ev.url.startsWith("http")) {
            try {
                ev.url = new URL(ev.url, baseUrl).href;
            } catch {}
        }
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

async function runChunkFlow(chunks, baseUrl) {
    console.log(`[DEBUG] Summarizing ${chunks.length} chunks...`);
    const summaryPromises = chunks.map((chunk, idx) =>
        summarizeChunk(chunk, baseUrl, idx, chunks.length)
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
        const result = await extractEventsFromSummary(summary, baseUrl);
        if (result && Array.isArray(result.events)) {
            allEvents.push(...result.events);
        }
    }
    return allEvents;
}

async function extractEventsFromUrl(url) {
    console.log(`[DEBUG] Starting extraction for URL: ${url}`);
    const rawHtml = await scrapePage(url);
    console.log(`[DEBUG] Scraped HTML length: ${rawHtml.length}`);

    // First pass: Merged chunks
    let chunks = sanitizeAndChunkHtml(rawHtml, url, true);
    console.log(`[DEBUG] First pass chunk count: ${chunks.length}`);
    let allEvents = await runChunkFlow(chunks, url);

    // If no events, fallback with no merging
    if (!allEvents.length) {
        console.log(`[DEBUG] No events found in merged-chunks approach. Trying fallback no-merge...`);
        const fallbackChunks = sanitizeAndChunkHtml(rawHtml, url, false);
        console.log(`[DEBUG] Fallback chunk count: ${fallbackChunks.length}`);
        allEvents = await runChunkFlow(fallbackChunks, url);
    }

    // ensure absolute if LLM returned a partial link
    ensureAbsoluteEventUrls(allEvents, url);

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