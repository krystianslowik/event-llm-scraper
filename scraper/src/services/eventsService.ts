import EventsRepository from "../db/eventsRepository";
import db from "../db/db";

let repository: EventsRepository | null = null;

export const activeJobs = new Map<string, number>();
export const clients = new Map<string, any[]>();

export async function initializeRepository(): Promise<EventsRepository> {
    if (!repository) {
        repository = await new EventsRepository(db).initialize();
    }
    return repository;
}

export function getRepository(): EventsRepository {
    if (!repository) {
        throw new Error('Repository not initialized');
    }
    return repository;
}