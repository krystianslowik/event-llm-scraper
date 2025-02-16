import { chromium, Browser, Page } from "playwright";
import * as cheerio from "cheerio";
import { OpenAI } from "openai";
import stringSimilarity from "string-similarity";
import db from "../db/db";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export async function scrapePage(url: string, settings: any = {}, retries: number = 3): Promise<string> {
    console.log(`[DEBUG] Starting to scrape page: ${url}`);
    const browser: Browser = await chromium.launch({ args: ['--disable-http2'] });
    const context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    });
    const page: Page = await context.newPage();
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            console.log(`[DEBUG] Attempt ${attempt} to navigate.`);
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
            let htmlContent = await page.content();
            if (settings.iterateIframes) {
                const frames = page.frames();
                for (const frame of frames) {
                    if (frame === page.mainFrame()) continue;
                    try {
                        const frameContent = await frame.content();
                        htmlContent += `\n<!-- Begin iframe content from ${frame.url()} -->\n`;
                        htmlContent += frameContent;
                        htmlContent += `\n<!-- End iframe content -->\n`;
                    } catch (err: any) {
                        console.error(`[DEBUG] Error extracting content from iframe: ${err.message}`);
                    }
                }
            }
            console.log(`[DEBUG] Successfully scraped page content.`);
            await browser.close();
            return htmlContent;
        } catch (error: any) {
            console.error(`[DEBUG] Error on attempt ${attempt}: ${error.message}`);
            if (attempt === retries) {
                await browser.close();
                throw new Error(`Failed to scrape ${url} after ${retries} attempts: ${error.message}`);
            }
        }
    }
    return "";
}

function gatherCandidateNodes($: ReturnType<typeof cheerio.load>, root: any, minTextLength: number, maxTextLength: number, showEventsWithoutLinks: boolean): any[] {
    const queue: any[] = [root];
    const results: any[] = [];
    while (queue.length) {
        const node = queue.shift();
        if (!node) continue;
        const el = $(node);
        const text = el.text().replace(/\s+/g, " ").trim();
        const linkCount = el.find("a[href]").filter((_: any, a: any) => $(a).attr("href") !== "#").length;
        const length = text.length;
        if (length < minTextLength) {
            const children = el.children().toArray();
            queue.push(...children);
            continue;
        }
        if (length <= maxTextLength) {
            if (!showEventsWithoutLinks && linkCount === 0) {
                const children = el.children().toArray();
                queue.push(...children);
                continue;
            }
            results.push(node);
        } else {
            const children = el.children().toArray();
            queue.push(...children);
        }
    }
    return results;
}

function resolveHref(href: string, baseUrl: string): string {
    try {
        return new URL(href, baseUrl).href;
    } catch {
        return href;
    }
}

function nodeToChunk($: ReturnType<typeof cheerio.load>, node: any, baseUrl: string, settings: any): string {
    const el = $(node);
    const text = el.text().replace(/\s+/g, " ").trim();
    const links: string[] = [];
    el.find("a[href]").each((_: any, a: any) => {
        const rawHref = $(a).attr("href");
        if (rawHref && rawHref !== "#") {
            const fullUrl = resolveHref(rawHref, baseUrl);
            links.push(fullUrl);
        }
    });
    if (!text) return "";
    let chunkText = text;
    if (links.length) {
        chunkText += `\nLinks found:\n${links.join("\n")}`;
    } else if (settings.showEventsWithoutLinks) {
        chunkText += `\nLink found:\n${baseUrl}`;
    }
    return chunkText;
}

function combineSmallChunks(chunks: string[], maxSize: number): string[] {
    const combined: string[] = [];
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

function sanitizeAndChunkHtml(html: string, baseUrl: string, mergeChunks: boolean, settings: any): string[] {
    console.log(`[DEBUG] Sanitizing HTML content...`);
    const $ = cheerio.load(html);
    $("script, style, meta, link, nav, footer").remove();
    const bodyEl = $("body").get(0);
    if (!bodyEl) {
        console.log("[DEBUG] No <body> found, returning fallback text.");
        return [$("body").text().replace(/\s+/g, " ").trim()];
    }
    const candidateNodes = gatherCandidateNodes($, bodyEl, settings.minTextLength, settings.maxTextLength, settings.showEventsWithoutLinks);
    console.log(`[DEBUG] Found ${candidateNodes.length} candidate nodes.`);
    let chunks = candidateNodes
        .map((node) => nodeToChunk($, node, baseUrl, settings))
        .filter(Boolean);
    if (!chunks.length) {
        const fallbackText = $("body").text().replace(/\s+/g, " ").trim();
        return [fallbackText];
    }
    console.log(`[DEBUG] Created ${chunks.length} initial chunks.`);
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const avgLength = (totalLength / chunks.length).toFixed(2);
    console.log(`[DEBUG] Total text length across chunks: ${totalLength} characters.`);
    console.log(`[DEBUG] Average chunk length: ${avgLength} characters.`);
    if (mergeChunks) {
        chunks = combineSmallChunks(chunks, settings.maxCombinedSize);
        console.log(`[DEBUG] After merging small chunks, we have ${chunks.length} combined chunks.`);
    } else {
        console.log(`[DEBUG] Skipping chunk merging (mergeChunks=false). Chunk count: ${chunks.length}`);
    }
    return chunks;
}

async function summarizeChunk(chunk: string, sourceUrl: string, index: number, total: number, settings: any): Promise<string> {
    console.log(`[DEBUG] Summarizing chunk ${index + 1}/${total} from ${sourceUrl} (length: ${chunk.length})`);
    const mandatoryInstructions = `
If you find any events, ensure the summary mentions:
- "Event Title"
- "Short Description"
- "URL" 
- "Category" - assign to one of following if possible: ${settings.categorySet}. If none category apply, use "Andere'
- "Date" - convert to ISO 8601. Only one date. If no year provided, use 2025.
`;
    const basePrompt = settings.customPrompt || "Please provide a concise summary of the following text.\nIf no events, state \"No events found.\". Do not skip any event. Make sure all of them are taken from the text provided. No markdown.\nResponse in German.\nDO NOT BE LAZY. THIS IS IMPORTANT.";
    const userPrompt = `${basePrompt}\n${mandatoryInstructions}\nHere's the text:\n${chunk}`;
    try {
        const response = await openai.chat.completions.create({
            model: settings.gptModel,
            messages: [{ role: "user", content: userPrompt }],
            temperature: 0.7,
        });
        const summary = response.choices[0].message?.content?.trim() || "";
        console.log(`[DEBUG] Summary obtained (chunk ${index + 1}): ${summary}`);
        return summary;
    } catch (error: any) {
        console.error(`[DEBUG] Error summarizing chunk ${index + 1}: ${error.message}`);
        return "";
    }
}

async function extractEventsFromSummary(summarizedText: string, sourceUrl: string, settings: any): Promise<any> {
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
            model: settings.gptModel,
            messages: [{ role: "user", content: userPrompt }],
            temperature: 0.2,
        });
        const content = response.choices[0].message?.content || "";
        console.log(`[DEBUG] Raw JSON response: ${content}`);
        return JSON.parse(content);
    } catch (error: any) {
        console.error(`[DEBUG] Error extracting events: ${error.message}`);
        return null;
    }
}

function ensureAbsoluteEventUrls(events: any[], baseUrl: string): void {
    for (const ev of events) {
        if (ev.url && !ev.url.startsWith("http")) {
            try {
                ev.url = new URL(ev.url, baseUrl).href;
            } catch {}
        }
    }
}

function fuzzyDeduplicate(allEvents: any[]): any[] {
    console.log(`[DEBUG] Starting fuzzy dedup. Total events before dedup: ${allEvents.length}`);
    const deduped: any[] = [];
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
                        `[DEBUG] Duplicate found. Skipping event:
  TitleA: "${ev.title}"
  TitleB: "${existing.title}"
  Date: "${ev.date}"
  Similarity: ${similarity.toFixed(2)}`
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

async function runChunkFlow(chunks: string[], baseUrl: string, settings: any): Promise<any[]> {
    console.log(`[DEBUG] Summarizing ${chunks.length} chunks...`);
    const summaryPromises = chunks.map((chunk, idx) =>
        summarizeChunk(chunk, baseUrl, idx, chunks.length, settings)
    );
    const summaries = await Promise.all(summaryPromises);
    console.log(`[DEBUG] Completed summarizing chunks.`);
    let allEvents: any[] = [];
    for (const [i, summary] of summaries.entries()) {
        const trimmed = summary.trim();
        if (!trimmed || trimmed === "No events found.") {
            console.log(`[DEBUG] Skipping chunk ${i + 1}, it's empty or no events.`);
            continue;
        }
        console.log(`[DEBUG] Extracting events from chunk ${i + 1} summary...`);
        const result = await extractEventsFromSummary(summary, baseUrl, settings);
        if (result && Array.isArray(result.events)) {
            allEvents.push(...result.events);
        }
    }
    return allEvents;
}

export async function extractEventsFromUrl(url: string, settings: any = {}): Promise<{ events: any[], categories: string[] }> {
    console.log(`[DEBUG] Starting extraction for URL: ${url}`);
    const effectiveSettings = {
        minTextLength: settings.minTextLength || 25,
        maxTextLength: settings.maxTextLength || 4000,
        maxCombinedSize: settings.maxCombinedSize || 4000,
        categorySet: settings.categorySet || "Familienleben, Aktivitäten, Veranstaltungen, Essen/Rezepte, Münsterland, Kultur/Lifestyle, Gesundheit, Reisen, Einkaufen, Gemeinschaft, Tipps & Ratgeber",
        customPrompt: settings.customPrompt || null,
        gptModel: settings.gptModel || "gpt-4o-mini",
        showEventsWithoutLinks: settings.showEventsWithoutLinks || false,
        iterateIframes: settings.iterateIframes || false
    };

    const rawHtml = await scrapePage(url, effectiveSettings);
    console.log(`[DEBUG] Scraped HTML length: ${rawHtml.length}`);
    let chunks = sanitizeAndChunkHtml(rawHtml, url, true, effectiveSettings);
    console.log(`[DEBUG] First pass chunk count: ${chunks.length}`);
    let allEvents = await runChunkFlow(chunks, url, effectiveSettings);
    if (!allEvents.length) {
        console.log(`[DEBUG] No events found in merged-chunks approach. Trying fallback no-merge...`);
        const fallbackChunks = sanitizeAndChunkHtml(rawHtml, url, false, effectiveSettings);
        console.log(`[DEBUG] Fallback chunk count: ${fallbackChunks.length}`);
        allEvents = await runChunkFlow(fallbackChunks, url, effectiveSettings);
    }
    ensureAbsoluteEventUrls(allEvents, url);
    allEvents = fuzzyDeduplicate(allEvents);
    console.log(`[DEBUG] Final count of events after dedup: ${allEvents.length}`);
    const categorySetResult = new Set<string>();
    allEvents.forEach((ev) => {
        if (ev.category) {
            categorySetResult.add(ev.category.trim());
        }
    });

    try {
        await db('scraping_attempts').insert({
            source_url: url,
            settings_used: effectiveSettings,
            event_count: allEvents.length
        });

        const sourceSettings = await db('source_settings')
            .where({ source_url: url })
            .first();

        if (sourceSettings && sourceSettings.expected_events) {
            const expected = sourceSettings.expected_events;
            const scraped = allEvents.length;
            const accuracy = 1 - Math.abs(scraped - expected) / expected;
            const completeness = Math.min(scraped / expected, 1);
            const weights = {
                accuracy: process.env.SCORING_ACCURACY_WEIGHT ? parseFloat(process.env.SCORING_ACCURACY_WEIGHT) : 0.7,
                completeness: process.env.SCORING_COMPLETENESS_WEIGHT ? parseFloat(process.env.SCORING_COMPLETENESS_WEIGHT) : 0.3
            };
            const score = (weights.accuracy * accuracy) + (weights.completeness * completeness);
            await db('scoring_results').insert({
                source_url: url,
                score_type: 'known',
                score_data: JSON.stringify({
                    accuracy,
                    completeness,
                    score,
                    scraped,
                    expected,
                    settings: effectiveSettings
                })
            });
        }
    } catch (err: any) {
        console.error(`[DEBUG] Error during scoring: ${err.message}`);
    }

    return {
        events: allEvents,
        categories: Array.from(categorySetResult)
    };
}