import { Request, Response } from 'express';
import * as scoresService from '../services/scoresService';

export const getKnownScores = async (req: Request, res: Response): Promise<void> => {
    try {
        const sourceUrl = req.params.url;
        const scores = await scoresService.getKnownScores(sourceUrl);
        res.json(scores);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getUnknownScores = async (req: Request, res: Response): Promise<void> => {
    try {
        const sourceUrl = req.params.url;
        const result = await scoresService.getUnknownScores(sourceUrl);
        res.json(result);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};