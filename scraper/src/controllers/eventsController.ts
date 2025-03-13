import { Request, Response } from 'express';
import db from "../db/db";
import { getRepository, activeJobs, clients } from '../services/eventsService';
import { extractEventsFromUrl } from '../modules/eventExtractor';
import { saveSettings } from '../services/settingsService';

interface EffectiveSettings {
    minTextLength: number;
    maxTextLength: number;
    maxCombinedSize: number;
    categorySet: string;
    customPrompt: string | null;
    gptModel: string;
    showEventsWithoutLinks: boolean;
    iterateIframes: boolean;
}

function parseBoolean(value: any): boolean {
    return value === 'true' || value === true;
}

async function getEffectiveSettings(sourceUrl: string, query: any): Promise<EffectiveSettings> {
    let effectiveSettings: EffectiveSettings;
    let isNewUrl = false;
    
    try {
        const storedSettingsRecord = await db('source_settings')
            .where({ source_url: sourceUrl })
            .first();
        if (storedSettingsRecord) {
            effectiveSettings = storedSettingsRecord.settings;
        } else {
            isNewUrl = true;
            effectiveSettings = {
                minTextLength: query.minTextLength && Number(query.minTextLength) > 0 ? parseInt(query.minTextLength) : 25,
                maxTextLength: query.maxTextLength && Number(query.maxTextLength) > 0 ? parseInt(query.maxTextLength) : 4000,
                maxCombinedSize: query.maxCombinedSize && Number(query.maxCombinedSize) > 0 ? parseInt(query.maxCombinedSize) : 4000,
                categorySet: query.categorySet && typeof query.categorySet === 'string' && query.categorySet.trim() !== ''
                    ? query.categorySet
                    : "Familienleben, Aktivitäten, Veranstaltungen, Essen/Rezepte, Münsterland, Kultur/Lifestyle, Gesundheit, Reisen, Einkaufen, Gemeinschaft, Tipps & Ratgeber",
                customPrompt: query.prompt && typeof query.prompt === 'string' && query.prompt.trim() !== '' ? query.prompt : null,
                gptModel: query.gptModel && typeof query.gptModel === 'string' && query.gptModel.trim() !== '' ? query.gptModel : "gpt-4o-mini",
                showEventsWithoutLinks: query.showEventsWithoutLinks ? parseBoolean(query.showEventsWithoutLinks) : false,
                iterateIframes: query.iterateIframes ? parseBoolean(query.iterateIframes) : false
            };
        }
    } catch (error) {
        isNewUrl = true;
        effectiveSettings = {
            minTextLength: query.minTextLength && Number(query.minTextLength) > 0 ? parseInt(query.minTextLength) : 25,
            maxTextLength: query.maxTextLength && Number(query.maxTextLength) > 0 ? parseInt(query.maxTextLength) : 4000,
            maxCombinedSize: query.maxCombinedSize && Number(query.maxCombinedSize) > 0 ? parseInt(query.maxCombinedSize) : 4000,
            categorySet: query.categorySet && typeof query.categorySet === 'string' && query.categorySet.trim() !== ''
                ? query.categorySet
                : "Familienleben, Aktivitäten, Veranstaltungen, Essen/Rezepte, Münsterland, Kultur/Lifestyle, Gesundheit, Reisen, Einkaufen, Gemeinschaft, Tipps & Ratgeber",
            customPrompt: query.prompt && typeof query.prompt === 'string' && query.prompt.trim() !== '' ? query.prompt : null,
            gptModel: query.gptModel && typeof query.gptModel === 'string' && query.gptModel.trim() !== '' ? query.gptModel : "gpt-4o-mini",
            showEventsWithoutLinks: query.showEventsWithoutLinks ? parseBoolean(query.showEventsWithoutLinks) : false,
            iterateIframes: query.iterateIframes ? parseBoolean(query.iterateIframes) : false
        };
    }
    
    // Automatically save unknown URLs with their default settings
    if (isNewUrl) {
        try {
            await saveSettings(sourceUrl, effectiveSettings);
            console.log(`Auto-saved settings for new URL: ${sourceUrl}`);
        } catch (saveError) {
            console.error(`Failed to auto-save settings for URL ${sourceUrl}:`, saveError);
            // Continue with processing even if saving fails
        }
    }
    
    return effectiveSettings;
}

export async function getEventsStream(req: Request, res: Response): Promise<void> {
    const sourceUrl = req.query.url as string;
    if (!sourceUrl) {
        res.status(400).json({ error: 'Missing URL parameter' });
        return;
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    if (!clients.has(sourceUrl)) {
        clients.set(sourceUrl, []);
    }
    clients.get(sourceUrl)!.push(res);
    console.log(`Client subscribed to updates for URL: ${sourceUrl}`);

    try {
        const repository = getRepository();
        const cachedEvents = await repository.getEventsBySourceUrl(sourceUrl);
        if (cachedEvents.length > 0) {
            const hasActiveJob = activeJobs.has(sourceUrl);
            const status = hasActiveJob ? 'cached' : 'fetched';
            const initialData = {
                data: cachedEvents,
                status: status
            };
            res.write(`data: ${JSON.stringify(initialData)}\n\n`);
        }
    } catch (error) {
        console.error('Error sending initial events to SSE client:', error);
    }

    req.on('close', () => {
        const urlClients = clients.get(sourceUrl) || [];
        clients.set(sourceUrl, urlClients.filter(client => client !== res));
        console.log(`Client unsubscribed from URL: ${sourceUrl}`);
    });
}

export async function getEvents(req: Request, res: Response): Promise<void> {
    const sourceUrl = req.query.url as string;
    if (!sourceUrl) {
        res.status(400).json({ error: 'Missing URL parameter' });
        return;
    }
    const effectiveSettings = await getEffectiveSettings(sourceUrl, req.query);
    try {
        const repository = getRepository();
        const cachedEvents = await repository.getEventsBySourceUrl(sourceUrl);
        let triggerJob = false;
        if (!activeJobs.has(sourceUrl)) {
            triggerJob = true;
            activeJobs.set(sourceUrl, Date.now());
        }
        const responseStatus = triggerJob ? 'cached' : (cachedEvents.length > 0 ? 'cached' : 'fetched');
        const jobId = activeJobs.get(sourceUrl) || null;
        res.json({
            data: cachedEvents,
            status: responseStatus,
            jobId: jobId
        });

        if (triggerJob) {
            (async () => {
                try {
                    console.log(`Starting background job for URL: ${sourceUrl}`);
                    const { events } = await extractEventsFromUrl(sourceUrl, effectiveSettings);
                    await repository.upsertEvents(events, sourceUrl);
                    console.log(`Background job completed for URL: ${sourceUrl}`);
                    const mergedEvents = await repository.getEventsBySourceUrl(sourceUrl);
                    const urlClients = clients.get(sourceUrl) || [];
                    urlClients.forEach(client => {
                        client.write(`data: ${JSON.stringify({ data: mergedEvents, status: 'fetched' })}\n\n`);
                    });
                } catch (error: any) {
                    console.error(`Background processing error for ${sourceUrl}:`, error);
                    const urlClients = clients.get(sourceUrl) || [];
                    urlClients.forEach(client => {
                        client.write(`data: ${JSON.stringify({ error: error.message, status: 'error' })}\n\n`);
                    });
                } finally {
                    activeJobs.delete(sourceUrl);
                }
            })();
        }
    } catch (error: any) {
        console.error(`Error processing ${sourceUrl}:`, error);
        res.status(500).json({ error: error.message });
    }
}