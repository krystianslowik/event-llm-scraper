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
}

module.exports = EventsRepository;