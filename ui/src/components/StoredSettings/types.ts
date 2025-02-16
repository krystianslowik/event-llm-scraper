import type { AdvancedSettings } from '../../App';

export interface StoredSetting {
  id: number;
  source_url: string;
  settings: AdvancedSettings;
  created_at: string;
  updated_at: string;
}

export interface ScoringResult {
  id: number;
  source_url: string;
  score_type: string;
  score_data: {
    score: number;
    accuracy: number;
    completeness: number;
    scraped: number;
    expected: number;
    settings?: AdvancedSettings;
  };
  calculated_at: string;
}