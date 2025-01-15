const { chromium } = require("playwright");
const axios = require("axios");
const cheerio = require("cheerio");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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

function sanitizeAndChunkHtml(html) {
    console.log(`[DEBUG] Sanitizing HTML content...`);
    const $ = cheerio.load(html);

    // non-content tags
    $("script, style, meta, link, nav, footer").remove();

    // filter out small or irrelevant elements
    const candidateElements = $("main, section, article, div").filter((_, el) => {
        const text = $(el).text().replace(/\s+/g, " ").trim();
        return (
            text.length > 25 &&
            $(el).find("a[href]").filter((_, a) => $(a).attr("href") !== "#").length > 0
        );
    });

    console.log(`[DEBUG] Found ${candidateElements.length} candidate elements.`);

    // build chunks
    const chunks = [];
    candidateElements.each((_, el) => {
        const text = $(el).text().replace(/\s+/g, " ").trim();
        const links = [];
        $(el)
            .find("a[href]")
            .each((_, a) => {
                const href = $(a).attr("href");
                if (href && href !== "#") {
                    links.push(href);
                }
            });

        let chunkText = text;
        if (links.length) {
            chunkText += `\nLinks found:\n${links.join("\n")}`;
        }
        if (chunkText) {
            chunks.push(chunkText);
        }
    });

    console.log(`[DEBUG] Created ${chunks.length} chunks after sanitization.`);

    //  some statistics for debugging
    if (chunks.length) {
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
        const avgLength = (totalLength / chunks.length).toFixed(2);
        console.log(`[DEBUG] Total text length across chunks: ${totalLength} characters.`);
        console.log(`[DEBUG] Average chunk length: ${avgLength} characters.`);
    }

    // Fallback if no candidates found
    if (chunks.length === 0) {
        const fallbackText = $.text().replace(/\s+/g, " ").trim();
        return [fallbackText];
    }

    return chunks;
}

async function summarizeChunk(chunk, sourceUrl) {
    console.log(`[DEBUG] Summarizing chunk from ${sourceUrl} (length: ${chunk.length})`);

    const userPrompt = `
Please provide a concise summary of the following text. 
If you find any events, ensure the summary mentions:
- "Event Title"
- "Short Description"
- "URL"
- "Category"
- "Date"
If no events, state "No events found." 
Here's the text:
${chunk}
`;

    try {
        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: userPrompt }],
                temperature: 0.7,
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                },
            }
        );
        const summary = response.data.choices[0].message.content.trim();
        console.log(`[DEBUG] Summary obtained: ${summary}`);
        return summary;
    } catch (error) {
        console.error(`[DEBUG] Error summarizing chunk: ${error.message}`);
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

Extract event details from the summary below:
- Title of the event
- Description
- URL to the details
- Category (e.g., local, education, etc.)
- Date (any recognized date format, including relative references like "today", "tomorrow", "yesterday")

If there are no events, return an empty "events": [] array.
Make sure there's no unterminated json and answer contains just what I asked for. 
Source: ${sourceUrl}
Summary:
${summarizedText}
`;

    try {
        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: userPrompt }],
                temperature: 0.2,
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                },
            }
        );
        const content = response.data.choices[0].message.content;
        console.log(`[DEBUG] Raw JSON response received. ${content}`);
        return JSON.parse(content);
    } catch (error) {
        console.error(`[DEBUG] Error extracting events: ${error.message}`);
        return null;
    }
}

async function extractEventsFromUrl(url) {
    console.log(`[DEBUG] Starting extraction for URL: ${url}`);
    const rawHtml = await scrapePage(url);

    console.log(`[DEBUG] Scraped HTML length: ${rawHtml.length}`);
    const chunks = sanitizeAndChunkHtml(rawHtml);
    console.log(`[DEBUG] Chunks count: ${chunks.length}`);

    // summarize all chunks in parallel
    const summaryPromises = chunks.map((chunk) => summarizeChunk(chunk, url));
    const summaries = await Promise.all(summaryPromises);
    console.log(`[DEBUG] Completed summarizing chunks.`);

    // combine them
    const combinedSummary = summaries.join("\n\n");
    console.log(`[DEBUG] Combined summary length: ${combinedSummary.length}`);

    // final extraction
    const finalResponse = await extractEventsFromSummary(combinedSummary, url);
    if (finalResponse && Array.isArray(finalResponse.events)) {
        console.log(`[DEBUG] Extracted ${finalResponse.events.length} events.`);

        // categories in a set to remove duplicates
        const categorySet = new Set();
        finalResponse.events.forEach((ev) => {
            if (ev.category) {
                categorySet.add(ev.category.trim());
            }
        });

        return {
            events: finalResponse.events,
            categories: Array.from(categorySet),
        };
    }

    console.log(`[DEBUG] No valid structured response.`);
    return {
        events: [],
        categories: [],
    };
}

module.exports = {
    extractEventsFromUrl,
};