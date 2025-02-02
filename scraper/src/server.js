const express = require('express');
const cors = require('cors');
const db = require('./db/db');
const EventsRepository = require('./db/eventsRepository');
const { extractEventsFromUrl } = require('./modules/eventExtractor');

const app = express();
app.use(cors());

// Map to keep track of active background jobs for each URL
const activeJobs = new Map();

// Map to keep track of SSE client subscriptions for each URL
const clients = new Map();

async function setupServer() {
    const repository = await new EventsRepository(db).initialize();

    /**
     * SSE Endpoint to subscribe to event updates for a specific URL
     * Clients connect to this endpoint with a 'url' query parameter
     */
    app.get('/events-stream', async (req, res) => {
        const sourceUrl = req.query.url;

        if (!sourceUrl) {
            res.status(400).json({ error: 'Missing URL parameter' });
            return;
        }

        // SSE setup
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        // Initialize clients list
        if (!clients.has(sourceUrl)) {
            clients.set(sourceUrl, []);
        }
        clients.get(sourceUrl).push(res);

        console.log(`Client subscribed to updates for URL: ${sourceUrl}`);

        // Send initial cached events if available
        try {
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

        // Handle client disconnect
        req.on('close', () => {
            const urlClients = clients.get(sourceUrl) || [];
            clients.set(sourceUrl, urlClients.filter(client => client !== res));
            console.log(`Client unsubscribed from URL: ${sourceUrl}`);
        });
    });

    /**
     * Events Endpoint to fetch events by URL
     * Returns cached events immediately if available and triggers background update
     */
    app.get('/events', async (req, res) => {
        const sourceUrl = req.query.url;

        if (!sourceUrl) {
            return res.status(400).json({ error: 'Missing URL parameter' });
        }

        try {
            const cachedEvents = await repository.getEventsBySourceUrl(sourceUrl);

            // Always trigger a background job if one is not already running.
            let triggerJob = false;
            if (!activeJobs.has(sourceUrl)) {
                triggerJob = true;
                activeJobs.set(sourceUrl, Date.now());
            }

            // Even if there are no cached events, if a job is triggered,
            // we return status 'cached' so that the frontend subscribes to SSE.
            const responseStatus = triggerJob ? 'cached' : (cachedEvents.length > 0 ? 'cached' : 'fetched');
            const jobId = activeJobs.get(sourceUrl) || null;

            res.json({
                data: cachedEvents,
                status: responseStatus,
                jobId: jobId,
            });

            if (triggerJob) {
                if (cachedEvents.length > 0) {
                    // Background job branch when cached events exist
                    (async () => {
                        try {
                            console.log(`Starting background job for URL: ${sourceUrl}`);
                            const { events } = await extractEventsFromUrl(sourceUrl);
                            await repository.upsertEvents(events, sourceUrl);
                            console.log(`Background job completed for URL: ${sourceUrl}`);

                            // Fetch merged events after upsert
                            const mergedEvents = await repository.getEventsBySourceUrl(sourceUrl);
                            const urlClients = clients.get(sourceUrl) || [];
                            urlClients.forEach(client => {
                                client.write(`data: ${JSON.stringify({ data: mergedEvents, status: 'fetched' })}\n\n`);
                            });
                        } catch (error) {
                            console.error(`Background processing error for ${sourceUrl}:`, error);
                            const urlClients = clients.get(sourceUrl) || [];
                            urlClients.forEach(client => {
                                client.write(`data: ${JSON.stringify({ error: error.message, status: 'error' })}\n\n`);
                            });
                        } finally {
                            activeJobs.delete(sourceUrl);
                        }
                    })();
                } else {
                    // Immediate fetch branch when no cached events exist
                    (async () => {
                        try {
                            console.log(`Fetching data for URL: ${sourceUrl}`);
                            const { events } = await extractEventsFromUrl(sourceUrl);
                            await repository.upsertEvents(events, sourceUrl);
                            console.log(`Data fetched and stored for URL: ${sourceUrl}`);

                            // Fetch merged events after upsert
                            const mergedEvents = await repository.getEventsBySourceUrl(sourceUrl);
                            const urlClients = clients.get(sourceUrl) || [];
                            urlClients.forEach(client => {
                                client.write(`data: ${JSON.stringify({ data: mergedEvents, status: 'fetched' })}\n\n`);
                            });
                        } catch (error) {
                            console.error(`Error fetching data for ${sourceUrl}:`, error);
                            const urlClients = clients.get(sourceUrl) || [];
                            urlClients.forEach(client => {
                                client.write(`data: ${JSON.stringify({ error: error.message, status: 'error' })}\n\n`);
                            });
                        } finally {
                            activeJobs.delete(sourceUrl);
                        }
                    })();
                }
            }
        } catch (error) {
            console.error(`Error processing ${sourceUrl}:`, error);
            res.status(500).json({ error: error.message });
        }
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

setupServer().catch(err => {
    console.error('Server initialization failed:', err);
    process.exit(1);
});