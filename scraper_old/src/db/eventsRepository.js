class EventsRepository {
    constructor(db) {
        this.db = db;
    }

    async initialize() {
        await this.db.migrate.latest();
        return this;
    }

    async getEventsBySourceUrl(sourceUrl) {
        return this.db('events')
            .where({ source_url: sourceUrl })
            .orderBy(['date', 'title']);
    }

    async findSimilarEvents(event, sourceUrl, similarityThreshold = 0.3, trx = null) {
        let query = this.db('events')
            .where({ source_url: sourceUrl })
            .andWhereRaw('similarity(title, ?) > ?', [event.title, similarityThreshold]);

        if (trx) {
            query = query.transacting(trx);
        }
        return query;
    }

    async createEvent(event, sourceUrl, trx = null) {
        let query = this.db('events').insert({
            title: event.title,
            description: event.description,
            url: event.url,
            source_url: sourceUrl,
            category: event.category,
            date: event.date
        });

        if (trx) {
            query = query.transacting(trx);
        }

        return query;
    }

    async updateEvent(eventId, updates, trx = null) {
        let query = this.db('events')
            .where({ id: eventId })
            .update({
                ...updates,
                updated_at: this.db.fn.now()
            });

        if (trx) {
            query = query.transacting(trx);
        }

        return query;
    }

    async upsertEvents(events, sourceUrl) {
        return this.db.transaction(async trx => {
            for (const event of events) {
                const existing = await this.findSimilarEvents(event, sourceUrl, 0.3, trx); // ✅ Pass trx

                if (existing.length === 0) {
                    await this.createEvent(event, sourceUrl, trx); // ✅ Pass trx
                } else {
                    const existingEvent = existing[0];
                    if (existingEvent.description !== event.description ||
                        existingEvent.category !== event.category) {
                        await this.updateEvent(existingEvent.id, {
                            description: event.description,
                            category: event.category
                        }, trx); // ✅ Pass trx
                    }
                }
            }
        });
    }

    async logScrapingAttempt(sourceUrl, settingsUsed, eventCount) {
        return this.db('scraping_attempts').insert({
            source_url: sourceUrl,
            settings_used: settingsUsed,
            event_count: eventCount
        })
    }

    async saveScore(sourceUrl, scoreType, scoreData) {
        return this.db('scoring_results').insert({
            source_url: sourceUrl,
            score_type: scoreType,
            score_data: scoreData
        })
    }

    async getScrapingAttempts(sourceUrl) {
        return this.db('scraping_attempts')
            .where({ source_url: sourceUrl })
            .select('*')
    }

    async getScores(sourceUrl) {
        return this.db('scoring_results')
            .where({ source_url: sourceUrl })
            .select('*')
    }
}

module.exports = EventsRepository;