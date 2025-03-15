import React, { useEffect, useState, useMemo } from 'react';
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
  const [searchTerm, setSearchTerm] = useState<string>('');

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

      // Create a copy to work with
      let updatedRecord = {...prev};
      
      if (field === 'source_url') {
        updatedRecord = {
          ...prev,
          source_url: value
        };
      } else if (field.startsWith('settings.')) {
        const settingField = field.split('.')[1];
        updatedRecord = {
          ...prev,
          settings: {
            ...prev.settings,
            [settingField]: value
          }
        };
      } else {
        return prev;
      }
      
      // Ensure customPrompt is always set
      if (field === 'settings.customPrompt' && !value) {
        updatedRecord.settings.customPrompt = DEFAULT_SETTINGS.customPrompt;
      }
      
      // Always make sure customPrompt is set
      if (!updatedRecord.settings.customPrompt) {
        updatedRecord.settings.customPrompt = DEFAULT_SETTINGS.customPrompt;
      }
      
      return updatedRecord;
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
    // Hardcode the default prompt text directly
    const hardcodedDefaultPrompt = `Please provide a concise summary of the following text. If no events, state "No events found.". Do not skip any event. Make sure all of them are taken from the text provided. No markdown. Response in German. DO NOT BE LAZY. THIS IS IMPORTANT.`;
    
    // Force the prompt to be the hardcoded value
    const newSetting: StoredSetting = {
      id: Date.now(), // Use timestamp as temporary ID
      source_url: '',
      settings: {
        minTextLength: 25,
        maxTextLength: 4000,
        maxCombinedSize: 4000,
        categorySet: "Familienleben, Aktivitäten, Veranstaltungen, Essen/Rezepte, Münsterland, Kultur/Lifestyle, Gesundheit, Reisen, Einkaufen, Gemeinschaft, Tipps & Ratgeber",
        customPrompt: hardcodedDefaultPrompt, // Use hardcoded value
        gptModel: "gpt-4o-mini",
        showEventsWithoutLinks: false,
        iterateIframes: false,
        expectedEvents: 0,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // Log to verify the customPrompt is set
    console.log("New setting created with hardcoded prompt:", newSetting.settings.customPrompt);
    
    setNewRecord(newSetting);
  };

  const saveNewSetting = async () => {
    if (!newRecord) return;
    
    // Validate required fields
    if (!newRecord.source_url.trim()) {
      alert('Source URL is required');
      return;
    }
    
    // Create a copy to make sure customPrompt is set
    const recordToSave = {
      ...newRecord,
      settings: {
        ...newRecord.settings,
        // If customPrompt is somehow empty, use the default
        customPrompt: newRecord.settings.customPrompt || DEFAULT_SETTINGS.customPrompt
      }
    };
    
    try {
      console.log("Saving setting with prompt:", recordToSave.settings.customPrompt);
      const saved = await apiSaveSetting(recordToSave);
      setSettingsList(prev => [...prev, saved]);
      setNewRecord(null);
      
      // Show confirmation toast or message
      const confirmationEl = document.createElement('div');
      confirmationEl.className = 'fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-md shadow-lg z-50';
      confirmationEl.innerText = 'Settings saved successfully!';
      document.body.appendChild(confirmationEl);
      
      // Remove after 3 seconds
      setTimeout(() => {
        if (document.body.contains(confirmationEl)) {
          document.body.removeChild(confirmationEl);
        }
      }, 3000);
      
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

  // Filter settings based on search
  const filteredSettings = useMemo(() => {
    if (!searchTerm.trim()) return settingsList;
    
    const lowercaseSearch = searchTerm.toLowerCase();
    return settingsList.filter(setting => 
      setting.source_url.toLowerCase().includes(lowercaseSearch) ||
      setting.settings.categorySet.toLowerCase().includes(lowercaseSearch) ||
      setting.settings.gptModel.toLowerCase().includes(lowercaseSearch)
    );
  }, [settingsList, searchTerm]);

  return (
    <div className="p-4">
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Source Settings</h2>
            <p className="text-gray-500 text-sm mt-1">
              Configure and manage settings for each source URL
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search settings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 w-full md:w-64"
              />
              <div className="absolute left-3 top-2.5 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <button
              onClick={addNewSetting}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 transition-colors"
            >
              <Plus size={18} />
              <span className="hidden md:inline">Add New</span>
            </button>
            {/* Debug button to show default settings */}
            <button
              onClick={() => {
                console.log("DEFAULT_SETTINGS:", DEFAULT_SETTINGS);
                alert(`Default prompt is: ${DEFAULT_SETTINGS.customPrompt ? DEFAULT_SETTINGS.customPrompt.substring(0, 50) + "..." : "MISSING!"}`);
              }}
              className="px-2 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-xs ml-2"
            >
              Debug
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            <p className="flex items-center gap-2 font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Error loading settings
            </p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        ) : filteredSettings.length === 0 && !newRecord ? (
          searchTerm ? (
            <div className="text-center py-12 border border-gray-100 rounded-md bg-gray-50">
              <p className="text-gray-500">No settings match your search</p>
              <button 
                onClick={() => setSearchTerm('')}
                className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="text-center py-12 border border-gray-100 rounded-md bg-gray-50">
              <p className="text-gray-500 mb-4">No stored settings found</p>
              <button
                onClick={addNewSetting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Plus size={18} />
                Add Your First Setting
              </button>
            </div>
          )
        ) : (
          <div className="space-y-6">
            {filteredSettings.map((setting) => renderSettingRow(setting))}
          </div>
        )}
      </div>
      
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