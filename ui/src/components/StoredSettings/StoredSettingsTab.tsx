import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import type { StoredSetting, ScoringResult } from './types';
import { SettingPreview } from './SettingPreview';
import { SettingForm } from './SettingForm';
import { NewSettingForm } from './NewSettingForm';
import { ScoreDisplay } from './ScoreDisplay';
import { fetchStoredSettings, fetchScoringResults, saveSetting as apiSaveSetting, deleteSetting as apiDeleteSetting } from '../../services/api';
import { DEFAULT_SETTINGS } from '../../config/settings';

export function StoredSettingsTab() {
  const [settingsList, setSettingsList] = useState<StoredSetting[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [editingIds, setEditingIds] = useState<Set<number>>(new Set());
  const [scoringExpandedIds, setScoringExpandedIds] = useState<Set<number>>(new Set());
  const [scoringResults, setScoringResults] = useState<{ [key: number]: ScoringResult[] }>({});
  const [newRecord, setNewRecord] = useState<StoredSetting | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await fetchStoredSettings();
      setSettingsList(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  const toggleEdit = (id: number) => {
    setEditingIds(prev => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  const toggleScoringExpand = async (id: number, source_url: string) => {
    setScoringExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
        if (!scoringResults[id]) {
          fetchScoringData(source_url, id);
        }
      }
      return newSet;
    });
  };

  const fetchScoringData = async (source_url: string, settingId: number) => {
    try {
      const data = await fetchScoringResults(source_url);
      setScoringResults(prev => ({ ...prev, [settingId]: data }));
    } catch (err: any) {
      console.error(err.message || 'Error fetching scoring results');
    }
  };

  const handleFieldChange = (id: number, field: string, value: any) => {
    setSettingsList(prev =>
      prev.map(setting =>
        setting.id === id
          ? {
              ...setting,
              settings: {
                ...setting.settings,
                [field]: value
              }
            }
          : setting
      )
    );
  };

  const handleSourceUrlChange = (id: number, value: string) => {
    setSettingsList(prev =>
      prev.map(setting =>
        setting.id === id
          ? {
              ...setting,
              source_url: value
            }
          : setting
      )
    );
  };

  const handleNewSettingChange = (field: string, value: any) => {
    if (!newRecord) return;
    
    setNewRecord(prev => {
      if (!prev) return null;

      if (field === 'source_url') {
        return {
          ...prev,
          source_url: value
        };
      } else if (field.startsWith('settings.')) {
        const settingField = field.split('.')[1];
        return {
          ...prev,
          settings: {
            ...prev.settings,
            [settingField]: value
          }
        };
      }
      return prev;
    });
  };

  const saveSetting = async (setting: StoredSetting) => {
    try {
      const saved = await apiSaveSetting(setting);
      setSettingsList(prev =>
        prev.map(s => (s.id === saved.id ? saved : s))
      );
      toggleEdit(setting.id);
      toggleExpand(setting.id);
    } catch (err: any) {
      alert(err.message || 'Error saving setting');
    }
  };

  const deleteSetting = async (setting: StoredSetting) => {
    if (window.confirm(`Are you sure you want to delete settings for ${setting.source_url}?`)) {
      try {
        await apiDeleteSetting(setting.source_url);
        setSettingsList(prev => prev.filter(s => s.id !== setting.id));
      } catch (err: any) {
        alert(err.message || 'Error deleting setting');
      }
    }
  };

  const addNewSetting = () => {
    const newSetting: StoredSetting = {
      id: Date.now(), // Use timestamp as temporary ID
      source_url: '',
      settings: {
        ...DEFAULT_SETTINGS,
        customPrompt: DEFAULT_SETTINGS.customPrompt, // Explicitly set customPrompt
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setNewRecord(newSetting);
  };

  const saveNewSetting = async () => {
    if (!newRecord) return;
    try {
      const saved = await apiSaveSetting(newRecord);
      setSettingsList(prev => [...prev, saved]);
      setNewRecord(null);
    } catch (err: any) {
      alert(err.message || 'Error saving new setting');
    }
  };

  const renderSettingRow = (setting: StoredSetting) => (
    <div key={setting.id} className="border rounded-md shadow-sm overflow-hidden mb-6">
      <div
        className="flex items-center justify-between bg-gray-100 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-200"
        onClick={() => toggleExpand(setting.id)}
      >
        <span className="font-bold text-gray-800">{setting.source_url}</span>
        {expandedIds.has(setting.id) ? <ChevronUp /> : <ChevronDown />}
      </div>
      {expandedIds.has(setting.id) && (
        <>
          {editingIds.has(setting.id) ? (
            <SettingForm
              setting={setting}
              onCancel={() => toggleEdit(setting.id)}
              onSave={saveSetting}
              onDelete={deleteSetting}
              onChange={handleFieldChange}
            />
          ) : (
            <SettingPreview
              setting={setting}
              onEdit={() => toggleEdit(setting.id)}
            />
          )}
          <div className="mt-4 border-t pt-4 m-4">
            <div
              className="flex items-center justify-between mb-4 cursor-pointer"
              onClick={() => toggleScoringExpand(setting.id, setting.source_url)}
            >
              <h4 className="text-md font-semibold text-gray-800">Past Scoring Results</h4>
              {scoringExpandedIds.has(setting.id) ? <ChevronUp /> : <ChevronDown />}
            </div>
            {scoringExpandedIds.has(setting.id) && (
              <div className="mt-3 space-y-4">
                {scoringResults[setting.id] && scoringResults[setting.id].length > 0 ? (
                  scoringResults[setting.id].map(result => (
                    <div key={result.id} className="border p-3 rounded-md shadow-sm bg-white">
                      <ScoreDisplay
                        score={result.score_data.score}
                        accuracy={result.score_data.accuracy}
                        completeness={result.score_data.completeness}
                        scraped={result.score_data.scraped}
                        expected={result.score_data.expected}
                        calculatedAt={result.calculated_at}
                      />
                      {result.score_data.settings && (
                        <div className="mt-3 space-y-2">
                          <pre className="p-2 bg-gray-50 border rounded text-xs overflow-x-auto">
                            {JSON.stringify(result.score_data.settings, null, 2)}
                          </pre>
                          <button
                            onClick={() => saveSetting({ ...setting, settings: result.score_data.settings! })}
                            className="inline-flex items-center px-3 py-1 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white transition-colors focus:ring-2 focus:ring-blue-500"
                          >
                            Restore Prompt Settings
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No scoring results available.</p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Stored Settings</h2>
        <button
          onClick={addNewSetting}
          className="flex items-center p-2 text-green-600 hover:bg-green-100 rounded-full focus:outline-none focus:ring-2 focus:ring-green-400 transition-colors"
        >
          <Plus size={20} />
        </button>
      </div>
      {loading ? (
        <p className="text-center text-gray-600">Loading stored settings…</p>
      ) : error ? (
        <p className="text-center text-red-600">Error: {error}</p>
      ) : settingsList.length === 0 && !newRecord ? (
        <p className="text-center text-gray-600">No stored settings found.</p>
      ) : (
        <div className="space-y-6">
          {settingsList.map((setting) => renderSettingRow(setting))}
        </div>
      )}
      {newRecord && (
        <NewSettingForm
          setting={newRecord}
          onSave={saveNewSetting}
          onCancel={() => setNewRecord(null)}
          onChange={handleNewSettingChange}
        />
      )}
    </div>
  );
}