import db from '../db/db';

export const getAllSettings = async (): Promise<any[]> => {
    return await db('source_settings').select('*');
};

export const getSettings = async (sourceUrl: string): Promise<any> => {
    return await db('source_settings').where({ source_url: sourceUrl }).first();
};

export const saveSettings = async (
    sourceUrl: string,
    settings: any,
    expectedEvents?: number
): Promise<any> => {
    const existing = await db('source_settings').where({ source_url: sourceUrl }).first();
    if (existing) {
        const updated = await db('source_settings')
            .where({ source_url: sourceUrl })
            .update({
                settings: settings,
                expected_events: expectedEvents,
                updated_at: db.fn.now()
            })
            .returning('*');
        return updated[0];
    } else {
        const inserted = await db('source_settings')
            .insert({ source_url: sourceUrl, settings: settings, expected_events: expectedEvents })
            .returning('*');
        return inserted[0];
    }
};

export const deleteSettings = async (sourceUrl: string): Promise<boolean> => {
    const numDeleted = await db('source_settings').where({ source_url: sourceUrl }).del();
    return numDeleted > 0;
};