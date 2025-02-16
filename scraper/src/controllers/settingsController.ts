import { Request, Response } from 'express';
import * as settingsService from '../services/settingsService';

export const getAllSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        const settingsRecords = await settingsService.getAllSettings();
        res.json(settingsRecords);
    } catch (error: any) {
        console.error('Error fetching all settings:', error);
        res.status(500).json({ error: 'Error fetching settings' });
    }
};

export const getSettings = async (req: Request, res: Response): Promise<void> => {
    const sourceUrl = req.query.sourceUrl;
    if (!sourceUrl || typeof sourceUrl !== 'string') {
        res.status(400).json({ error: 'Missing or invalid sourceUrl parameter' });
        return;
    }
    try {
        const settingsRecord = await settingsService.getSettings(sourceUrl);
        if (!settingsRecord) {
            res.status(404).json({ error: 'No settings found for the given sourceUrl' });
        } else {
            res.json(settingsRecord);
        }
    } catch (error: any) {
        console.error('Error fetching settings for sourceUrl:', error);
        res.status(500).json({ error: 'Error fetching settings' });
    }
};

export const saveSettings = async (req: Request, res: Response): Promise<void> => {
    const { sourceUrl, settings, expectedEvents } = req.body;
    if (!sourceUrl || !settings) {
        res.status(400).json({ error: 'sourceUrl and settings are required' });
        return;
    }
    try {
        const savedRecord = await settingsService.saveSettings(sourceUrl, settings, expectedEvents);
        res.json(savedRecord);
    } catch (error: any) {
        console.error('Error saving settings:', error);
        res.status(500).json({ error: 'Error saving settings' });
    }
};

export const deleteSettings = async (req: Request, res: Response): Promise<void> => {
    const sourceUrl = req.query.sourceUrl;
    if (!sourceUrl || typeof sourceUrl !== 'string') {
        res.status(400).json({ error: 'Missing or invalid sourceUrl parameter' });
        return;
    }
    try {
        const success = await settingsService.deleteSettings(sourceUrl);
        if (success) {
            res.json({ success: true, message: 'Setting deleted successfully' });
        } else {
            res.status(404).json({ error: 'No settings found for the given sourceUrl' });
        }
    } catch (error: any) {
        console.error('Error deleting settings:', error);
        res.status(500).json({ error: 'Error deleting settings' });
    }
};