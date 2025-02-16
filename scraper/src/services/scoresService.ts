import { getRepository } from '../services/eventsService';
import { calculateMedian } from '../utils/helpers';

export const getKnownScores = async (sourceUrl: string): Promise<any[]> => {
    const repository = getRepository();
    const scores = await repository.getScores(sourceUrl);
    return scores.filter(s => s.score_type === 'known');
};

export const getUnknownScores = async (sourceUrl: string): Promise<{ median: number; scores: any[] }> => {
    const repository = getRepository();
    const attempts = await repository.getScrapingAttempts(sourceUrl);
    const eventCounts = attempts.map(a => a.event_count);
    const median = calculateMedian(eventCounts);
    const scores = attempts.map(attempt => ({
        id: attempt.id,
        consensus: median ? 1 - (Math.abs(attempt.event_count - median) / median) : 0,
        event_count: attempt.event_count,
        settings: attempt.settings_used
    }));
    return { median, scores };
};