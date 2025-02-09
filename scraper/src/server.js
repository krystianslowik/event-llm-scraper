// Updated server.js
const express = require('express')
const cors = require('cors')
const db = require('./db/db')
const EventsRepository = require('./db/eventsRepository')
const { extractEventsFromUrl } = require('./modules/eventExtractor')

const app = express()
app.use(cors())
app.use(express.json());

const activeJobs = new Map()
const clients = new Map()

async function setupServer() {
    const repository = await new EventsRepository(db).initialize()

    // SSE Endpoint to subscribe to event updates for a specific URL.
    app.get('/events-stream', async (req, res) => {
        const sourceUrl = req.query.url
        if (!sourceUrl) {
            res.status(400).json({ error: 'Missing URL parameter' })
            return
        }
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        res.flushHeaders()

        if (!clients.has(sourceUrl)) {
            clients.set(sourceUrl, [])
        }
        clients.get(sourceUrl).push(res)
        console.log(`Client subscribed to updates for URL: ${sourceUrl}`)

        try {
            const cachedEvents = await repository.getEventsBySourceUrl(sourceUrl)
            if (cachedEvents.length > 0) {
                const hasActiveJob = activeJobs.has(sourceUrl)
                const status = hasActiveJob ? 'cached' : 'fetched'
                const initialData = {
                    data: cachedEvents,
                    status: status
                }
                res.write(`data: ${JSON.stringify(initialData)}\n\n`)
            }
        } catch (error) {
            console.error('Error sending initial events to SSE client:', error)
        }

        req.on('close', () => {
            const urlClients = clients.get(sourceUrl) || []
            clients.set(sourceUrl, urlClients.filter(client => client !== res))
            console.log(`Client unsubscribed from URL: ${sourceUrl}`)
        })
    })

    // Events Endpoint to fetch events by URL with optional settings.
    app.get('/events', async (req, res) => {
        const sourceUrl = req.query.url
        if (!sourceUrl) {
            return res.status(400).json({ error: 'Missing URL parameter' })
        }

        // Extract query parameters as fallback defaults
        const minTextLengthParam = req.query.minTextLength
        const maxTextLengthParam = req.query.maxTextLength
        const maxCombinedSizeParam = req.query.maxCombinedSize
        const categorySetParam = req.query.categorySet
        const customPromptParam = req.query.prompt
        const gptModelParam = req.query.gptModel
        const showEventsWithoutLinks = req.query.showEventsWithoutLinks
        const iterateIframes = req.query.iterateIframes

        // Determine effective settings: use stored settings if they exist for the URL,
        // otherwise fall back to the query parameters (or their defaults)
        let effectiveSettings
        try {
            const storedSettingsRecord = await db('source_settings')
                .where({ source_url: sourceUrl })
                .first()
            if (storedSettingsRecord) {
                console.log("[DEBUG] Used stored settings: ", storedSettingsRecord.settings)

                effectiveSettings = storedSettingsRecord.settings
            } else {
                effectiveSettings = {
                    minTextLength: (minTextLengthParam && Number(minTextLengthParam) > 0) ? parseInt(minTextLengthParam) : 25,
                    maxTextLength: (maxTextLengthParam && Number(maxTextLengthParam) > 0) ? parseInt(maxTextLengthParam) : 4000,
                    maxCombinedSize: (maxCombinedSizeParam && Number(maxCombinedSizeParam) > 0) ? parseInt(maxCombinedSizeParam) : 4000,
                    categorySet: (categorySetParam && typeof categorySetParam === 'string' && categorySetParam.trim() !== '')
                        ? categorySetParam
                        : "Familienleben, Aktivitäten, Veranstaltungen, Essen/Rezepte, Münsterland, Kultur/Lifestyle, Gesundheit, Reisen, Einkaufen, Gemeinschaft, Tipps & Ratgeber",
                    customPrompt: (customPromptParam && typeof customPromptParam === 'string' && customPromptParam.trim() !== '')
                        ? customPromptParam
                        : null,
                    gptModel: (gptModelParam && typeof gptModelParam === 'string' && gptModelParam.trim() !== '')
                        ? gptModelParam
                        : "gpt-4o-mini",
                    showEventsWithoutLinks: (showEventsWithoutLinks && typeof showEventsWithoutLinks === 'string' && showEventsWithoutLinks.trim() !== '')
                        ? showEventsWithoutLinks
                        : false,
                    iterateIframes: (iterateIframes && typeof iterateIframes === 'string' && iterateIframes.trim() !== '')
                        ? iterateIframes
                        : false
                }
                console.log("[DEBUG] Created new settings: ", effectiveSettings)
            }
        } catch (error) {
            console.error(`Error fetching stored settings for ${sourceUrl}:`, error)
            // Fallback to query parameters in case of an error fetching stored settings
            effectiveSettings = {
                minTextLength: (minTextLengthParam && Number(minTextLengthParam) > 0) ? parseInt(minTextLengthParam) : 25,
                maxTextLength: (maxTextLengthParam && Number(maxTextLengthParam) > 0) ? parseInt(maxTextLengthParam) : 4000,
                maxCombinedSize: (maxCombinedSizeParam && Number(maxCombinedSizeParam) > 0) ? parseInt(maxCombinedSizeParam) : 4000,
                categorySet: (categorySetParam && typeof categorySetParam === 'string' && categorySetParam.trim() !== '')
                    ? categorySetParam
                    : "Familienleben, Aktivitäten, Veranstaltungen, Essen/Rezepte, Münsterland, Kultur/Lifestyle, Gesundheit, Reisen, Einkaufen, Gemeinschaft, Tipps & Ratgeber",
                customPrompt: (customPromptParam && typeof customPromptParam === 'string' && customPromptParam.trim() !== '')
                    ? customPromptParam
                    : null,
                gptModel: (gptModelParam && typeof gptModelParam === 'string' && gptModelParam.trim() !== '')
                    ? gptModelParam
                    : "gpt-4o-mini",
                showEventsWithoutLinks: (showEventsWithoutLinks && typeof showEventsWithoutLinks === 'string' && showEventsWithoutLinks.trim() !== '')
                    ? showEventsWithoutLinks
                    : false,
                iterateIframes: (iterateIframes && typeof iterateIframes === 'string' && iterateIframes.trim() !== '')
                    ? iterateIframes
                    : false
            }
        }

        try {
            const cachedEvents = await repository.getEventsBySourceUrl(sourceUrl)
            let triggerJob = false
            if (!activeJobs.has(sourceUrl)) {
                triggerJob = true
                activeJobs.set(sourceUrl, Date.now())
            }
            const responseStatus = triggerJob ? 'cached' : (cachedEvents.length > 0 ? 'cached' : 'fetched')
            const jobId = activeJobs.get(sourceUrl) || null
            res.json({
                data: cachedEvents,
                status: responseStatus,
                jobId: jobId
            })

            if (triggerJob) {
                if (cachedEvents.length > 0) {
                    // Background job branch when cached events exist.
                    (async () => {
                        try {
                            console.log(`Starting background job for URL: ${sourceUrl}`)
                            const { events } = await extractEventsFromUrl(sourceUrl, effectiveSettings)
                            await repository.upsertEvents(events, sourceUrl)
                            console.log(`Background job completed for URL: ${sourceUrl}`)
                            const mergedEvents = await repository.getEventsBySourceUrl(sourceUrl)
                            const urlClients = clients.get(sourceUrl) || []
                            urlClients.forEach(client => {
                                client.write(`data: ${JSON.stringify({ data: mergedEvents, status: 'fetched' })}\n\n`)
                            })
                        } catch (error) {
                            console.error(`Background processing error for ${sourceUrl}:`, error)
                            const urlClients = clients.get(sourceUrl) || []
                            urlClients.forEach(client => {
                                client.write(`data: ${JSON.stringify({ error: error.message, status: 'error' })}\n\n`)
                            })
                        } finally {
                            activeJobs.delete(sourceUrl)
                        }
                    })()
                } else {
                    (async () => {
                        try {
                            console.log(`Fetching data for URL: ${sourceUrl}`)
                            console.log(`Settings for ${sourceUrl}:`, effectiveSettings)
                            const { events } = await extractEventsFromUrl(sourceUrl, effectiveSettings)
                            await repository.upsertEvents(events, sourceUrl)
                            console.log(`Data fetched and stored for URL: ${sourceUrl}`)
                            const mergedEvents = await repository.getEventsBySourceUrl(sourceUrl)
                            const urlClients = clients.get(sourceUrl) || []
                            urlClients.forEach(client => {
                                client.write(`data: ${JSON.stringify({ data: mergedEvents, status: 'fetched' })}\n\n`)
                            })
                        } catch (error) {
                            console.error(`Error fetching data for ${sourceUrl}:`, error)
                            const urlClients = clients.get(sourceUrl) || []
                            urlClients.forEach(client => {
                                client.write(`data: ${JSON.stringify({ error: error.message, status: 'error' })}\n\n`)
                            })
                        } finally {
                            activeJobs.delete(sourceUrl)
                        }
                    })()
                }
            }
        } catch (error) {
            console.error(`Error processing ${sourceUrl}:`, error)
            res.status(500).json({ error: error.message })
        }
    })

    app.get('/settings-all', async (req, res) => {
        try {
            const settingsRecords = await db('source_settings').select('*');
            return res.json(settingsRecords);
        } catch (err) {
            console.error('Error fetching all settings:', err);
            return res.status(500).json({ error: 'Error fetching settings' });
        }
    });

    app.get('/settings', async (req, res) => {
        const sourceUrl = req.query.sourceUrl;
        if (!sourceUrl) {
            return res.status(400).json({ error: 'Missing sourceUrl parameter' });
        }

        try {
            const settingsRecord = await db('source_settings')
                .where({ source_url: sourceUrl })
                .first();
            if (!settingsRecord) {
                return res.status(404).json({ error: 'No settings found for the given sourceUrl' });
            }
            return res.json(settingsRecord);
        } catch (err) {
            console.error('Error fetching settings for sourceUrl:', err);
            return res.status(500).json({ error: 'Error fetching settings' });
        }
    });

    app.post('/settings', async (req, res) => {
        const { sourceUrl, settings } = req.body;
        if (!sourceUrl || !settings) {
            return res.status(400).json({ error: 'sourceUrl and settings are required' });
        }

        try {
            // Check if settings for this sourceUrl already exist
            const existing = await db('source_settings')
                .where({ source_url: sourceUrl })
                .first();

            if (existing) {
                const updated = await db('source_settings')
                    .where({ source_url: sourceUrl })
                    .update({ settings: settings, updated_at: db.fn.now() })
                    .returning('*');
                return res.json(updated[0]);
            } else {
                const inserted = await db('source_settings')
                    .insert({ source_url: sourceUrl, settings: settings })
                    .returning('*');
                return res.json(inserted[0]);
            }
        } catch (err) {
            console.error('Error saving settings:', err);
            return res.status(500).json({ error: 'Error saving settings' });
        }
    });

    app.delete('/settings', async (req, res) => {
        const sourceUrl = req.query.sourceUrl;
        if (!sourceUrl) {
            return res.status(400).json({ error: 'Missing sourceUrl parameter' });
        }

        try {
            const numDeleted = await db('source_settings').where({ source_url: sourceUrl }).del();
            if (numDeleted === 0) {
                return res.status(404).json({ error: 'No settings found for the given sourceUrl' });
            }
            return res.json({ success: true, message: 'Setting deleted successfully' });
        } catch (err) {
            console.error('Error deleting settings:', err);
            return res.status(500).json({ error: 'Error deleting settings' });
        }
    });

    const PORT = process.env.PORT || 3000
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`)
    })
}

setupServer().catch(err => {
    console.error('Server initialization failed:', err)
    process.exit(1)
})