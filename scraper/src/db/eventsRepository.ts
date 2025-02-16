import db from './db';

export interface Event {
    id?: number;
    title: string;
    description?: string;
    url: string;
    source_url: string;
    category?: string;
    date?: string;
    created_at?: Date;
    updated_at?: Date;
}

class EventsRepository {
    private db: any;
    constructor(db: any) {
        this.db = db;
    }

    async initialize(): Promise<this> {
        await this.db.migrate.latest();
        return this;
    }

    async getEventsBySourceUrl(sourceUrl: string): Promise<Event[]> {
        return this.db('events')
            .where({ source_url: sourceUrl })
            .orderBy(['date', 'title']);
    }

    async findSimilarEvents(event: Event, sourceUrl: string, similarityThreshold = 0.3, trx: any = null): Promise<Event[]> {
        let query = this.db('events')
            .where({ source_url: sourceUrl })
            .andWhereRaw('similarity(title, ?) > ?', [event.title, similarityThreshold]);
        if (trx) {
            query = query.transacting(trx);
        }
        return query;
    }

    async createEvent(event: Event, sourceUrl: string, trx: any = null): Promise<any> {
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

    async updateEvent(eventId: number, updates: Partial<Event>, trx: any = null): Promise<any> {
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

    async upsertEvents(events: Event[], sourceUrl: string): Promise<void> {
        await this.db.transaction(async (trx: any) => {
            for (const event of events) {
                const existing = await this.findSimilarEvents(event, sourceUrl, 0.3, trx);
                if (existing.length === 0) {
                    await this.createEvent(event, sourceUrl, trx);
                } else {
                    const existingEvent = existing[0];
                    if (existingEvent.description !== event.description ||
                        existingEvent.category !== event.category) {
                        await this.updateEvent(existingEvent.id!, {
                            description: event.description,
                            category: event.category
                        }, trx);
                    }
                }
            }
        });
    }

    async logScrapingAttempt(sourceUrl: string, settingsUsed: any, eventCount: number): Promise<any> {
        return this.db('scraping_attempts').insert({
            source_url: sourceUrl,
            settings_used: settingsUsed,
            event_count: eventCount
        });
    }

    async saveScore(sourceUrl: string, scoreType: string, scoreData: any): Promise<any> {
        return this.db('scoring_results').insert({
            source_url: sourceUrl,
            score_type: scoreType,
            score_data: scoreData
        });
    }

    async getScrapingAttempts(sourceUrl: string): Promise<any[]> {
        return this.db('scraping_attempts')
            .where({ source_url: sourceUrl })
            .select('*');
    }

    async getScores(sourceUrl: string): Promise<any[]> {
        return this.db('scoring_results')
            .where({ source_url: sourceUrl })
            .select('*');
    }
}

export default EventsRepository;