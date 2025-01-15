const fs = require("fs");
const { chromium } = require("playwright");
const axios = require("axios");
const cheerio = require("cheerio");

// Your OpenAI API key (example placeholder)
const OPENAI_API_KEY = "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";

async function scrapePage(url, retries = 3) {
    const browser = await chromium.launch({
        args: ["--disable-http2"],
    });
    const context = await browser.newContext({
        userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    });
    const page = await context.newPage();

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`Attempt ${attempt}: Navigating to ${url}`);
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
            const content = await page.content();
            await browser.close();
            return content;
        } catch (error) {
            console.error(`Error on attempt ${attempt} for ${url}: ${error.message}`);
            if (attempt === retries) {
                await browser.close();
                throw new Error(`Failed to scrape ${url} after ${retries} attempts`);
            }
        }
    }
}

function sanitizeAndChunkHtml(html) {
    const $ = cheerio.load(html);

    // Remove unneeded tags
    $("script, style, meta, link, nav, footer").remove();

    // Grab big structural elements (main, section, article)
    const sections = $("main, section, article");
    if (sections.length === 0) {
        // fallback to entire body
        return [$.text().replace(/\s+/g, " ").trim()];
    }

    const chunks = [];
    sections.each((_, el) => {
        const text = $(el).text().replace(/\s+/g, " ").trim();
        if (text) {
            chunks.push(text);
        }
    });

    if (chunks.length === 0) {
        return [$.text().replace(/\s+/g, " ").trim()];
    }

    return chunks;
}

async function summarizeChunk(chunk, sourceUrl) {
    console.log(
        `Summarizing a chunk from ${sourceUrl}... (length: ${chunk.length} chars)`
    );

    const userPrompt = `
Please provide a concise summary of the following text. 
If you find any events, ensure the summary mentions:
- "Event Title"
- "Short Description"
- "URL"
- "Category" 
If no events, state "No events found." No yapping. Make sure you extract ALL EVENTS. Do not skip any of it. As structured data (json), no markdown usage, no comments.
Here's the text:
${chunk}
`;

    try {
        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: userPrompt,
                    },
                ],
                temperature: 0.5,
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${OPENAI_API_KEY}`,
                },
            }
        );

        const summary = response.data.choices[0].message.content.trim();

        // Debug log: Show the raw summary returned by GPT
        console.log("\n[DEBUG] GPT Summaries:\n", summary, "\n");

        return summary;
    } catch (error) {
        console.error(`Error summarizing chunk for ${sourceUrl}:`, error.message);
        return "";
    }
}


async function extractEventsFromSummary(summarizedText, sourceUrl) {
    console.log(
        `Extracting events from summarized text for ${sourceUrl}...`
    );

    // Instruct the model to respond in valid JSON, WITHOUT code fences
    const userPrompt = `
You are a helpful assistant. Return the data in valid JSON (no code fences). 
Structure it exactly as:
{
  "events": [
    {
      "title": "<string>",
      "description": "<string>",
      "url": "<string>",
      "category": "<string>"
    }
  ]
}
Extract event details from the summary below:
- Title of the event
- Short description
- URL to the details
- Category (e.g., local, education, etc.)

If there are no events, return an empty "events": [] array. No yapping. Make sure you extract ALL EVENTS. Do not skip any of it.

Source: ${sourceUrl}
Summary:
${summarizedText}
`;

    try {
        const response = await axios.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "user",
                        content: userPrompt,
                    },
                ],
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

        // Debug log: Show the raw JSON string returned by GPT
        console.log("\n[DEBUG] GPT Extraction Raw Content:\n", content, "\n");

        try {
            const parsed = JSON.parse(content);
            return parsed;
        } catch (parseErr) {
            console.error("Failed to parse JSON from LLM response:", parseErr.message);
            return null;
        }
    } catch (error) {
        console.error(`Error extracting events for ${sourceUrl}:`, error.message);
        return null;
    }
}

/**
 * Main function to:
 * 1) Read URLs from a file.
 * 2) Scrape each URL for HTML content.
 * 3) Sanitize and chunk the HTML.
 * 4) Summarize each chunk (1st iteration) using OpenAI.
 * 5) Combine all summaries, then extract structured event data (2nd iteration).
 */
async function main() {
    // Read URLs from "urls.txt"
    const urls = fs.readFileSync("urls.txt", "utf-8").split("\n").filter(Boolean);

    for (const url of urls) {
        console.log(`\nProcessing URL: ${url}`);
        try {
            // Step 1) Scrape raw HTML
            const rawHtml = await scrapePage(url);

            // Step 2) Sanitize & chunk HTML
            const chunks = sanitizeAndChunkHtml(rawHtml);

            // Step 3) Summarize each chunk
            const summaries = [];
            for (const chunk of chunks) {
                if (!chunk) continue;
                const summary = await summarizeChunk(chunk, url);
                summaries.push(summary);
            }

            // Step 4) Combine all summaries
            const combinedSummary = summaries.join("\n\n");
            console.log("\n[DEBUG] Combined Summary:\n", combinedSummary, "\n");

            // Step 5) Extract final events from the combined summary
            const finalResponse = await extractEventsFromSummary(combinedSummary, url);

            if (finalResponse && Array.isArray(finalResponse.events)) {
                console.log(
                    "Extracted Events:",
                    JSON.stringify(finalResponse.events, null, 2)
                );
            } else {
                console.warn(
                    `No valid structured response received for ${url}`
                );
            }
        } catch (error) {
            console.error(`Error processing ${url}:`, error.message);
        }
    }
}

// Start the process
main().catch((error) => {
    console.error("Fatal error:", error.message);
});