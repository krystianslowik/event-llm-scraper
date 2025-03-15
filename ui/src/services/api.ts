import { API_CONFIG, USE_MOCK_DATA } from '../config';
import { mockEvents } from '../mocks/events';
import { mockStoredSettings } from '../mocks/settings';
import { mockScoringResults } from '../mocks/scoringResults';
import type { APIResponse } from '../types';
import type { StoredSetting, ScoringResult } from '../components/StoredSettings/types';

export async function fetchEvents(url: string): Promise<APIResponse> {
  if (USE_MOCK_DATA) {
    return {
      data: mockEvents,
      status: 'fetched'
    };
  }

  const response = await fetch(`${API_CONFIG.events.url}?url=${encodeURIComponent(url)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch events');
  }
  return response.json();
}

export async function fetchStoredSettings(): Promise<StoredSetting[]> {
  if (USE_MOCK_DATA) {
    return mockStoredSettings;
  }

  const response = await fetch(API_CONFIG.settings.url);
  if (!response.ok) {
    throw new Error('Failed to fetch settings');
  }
  return response.json();
}

export async function fetchScoringResults(sourceUrl: string): Promise<ScoringResult[]> {
  if (USE_MOCK_DATA) {
    // Find the mock scoring results for the given source URL
    const allResults = Object.values(mockScoringResults).flat();
    return allResults.filter(result => result.source_url === sourceUrl);
  }

  const response = await fetch(`${API_CONFIG.scores.url}/known/${encodeURIComponent(sourceUrl)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch scoring results');
  }
  return response.json();
}

export async function saveSetting(setting: StoredSetting): Promise<StoredSetting> {
  if (USE_MOCK_DATA) {
    // Simulate saving by returning the same setting
    return setting;
  }

  // Ensure customPrompt is set with default if missing
  const { DEFAULT_SETTINGS } = await import('../config/settings');
  
  const settingsToSave = {
    ...setting.settings,
    customPrompt: setting.settings.customPrompt || DEFAULT_SETTINGS.customPrompt
  };
  
  console.log("API saving with prompt:", settingsToSave.customPrompt);

  const response = await fetch(API_CONFIG.settings.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sourceUrl: setting.source_url,
      settings: settingsToSave,
      expectedEvents: setting.settings.expectedEvents
    })
  });

  if (!response.ok) {
    throw new Error('Failed to save setting');
  }
  return response.json();
}

export async function deleteSetting(sourceUrl: string): Promise<void> {
  if (USE_MOCK_DATA) {
    return; // Just return in mock mode
  }

  const response = await fetch(`${API_CONFIG.settings.url}?sourceUrl=${encodeURIComponent(sourceUrl)}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error('Failed to delete setting');
  }
}