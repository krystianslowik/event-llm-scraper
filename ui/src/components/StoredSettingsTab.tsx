import  { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, RefreshCw, X, Edit2, Plus } from 'lucide-react';
import type { AdvancedSettings } from '../App';
import {API_URL} from "../config.ts";
import { DEFAULT_SETTINGS } from '../config/settings';

interface StoredSetting {
    id: number;
    source_url: string;
    settings: AdvancedSettings;
    created_at: string;
    updated_at: string;
}

interface ScoringResult {
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

interface StoredSettingsTabProps {
    onRestoreSettings: (settings: AdvancedSettings) => void;
}

function getScoreColor(score: number): string {
    if (score >= 0.8) return 'bg-green-500';
    else if (score >= 0.5) return 'bg-yellow-500';
    else return 'bg-red-500';
}

export function StoredSettingsTab({}: StoredSettingsTabProps) {
    const [settingsList, setSettingsList] = useState<StoredSetting[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
    const [editingIds, setEditingIds] = useState<Set<number>>(new Set());
    const [scoringExpandedIds, setScoringExpandedIds] = useState<Set<number>>(new Set());
    const [scoringResults, setScoringResults] = useState<{ [key: number]: ScoringResult[] }>({});
    const [newRecord, setNewRecord] = useState<StoredSetting | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/settings/all`);
            if (!res.ok) throw new Error('Failed to fetch settings');
            const data = await res.json();
            setSettingsList(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

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

    const toggleScoringExpand = (id: number, source_url: string) => {
        setScoringExpandedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else {
                newSet.add(id);
                if (!scoringResults[id]) {
                    fetchScoringResults(source_url, id);
                }
            }
            return newSet;
        });
    };

    const fetchScoringResults = async (source_url: string, settingId: number) => {
        try {
            const res = await fetch(`${API_URL}/scores/known/${encodeURIComponent(source_url)}`);
            if (!res.ok) throw new Error('Failed to fetch scoring results');
            const data = await res.json();
            setScoringResults(prev => ({ ...prev, [settingId]: data }));
        } catch (err: any) {
            console.error(err.message || 'Error fetching scoring results');
        }
    };

    const handleFieldChange = (id: number, field: keyof AdvancedSettings, value: any) => {
        setSettingsList(prev =>
            prev.map(setting =>
                setting.id === id ? { ...setting, settings: { ...setting.settings, [field]: value } } : setting
            )
        );
    };

    const handleSourceUrlChange = (id: number, value: string) => {
        setSettingsList(prev =>
            prev.map(setting => (setting.id === id ? { ...setting, source_url: value } : setting))
        );
    };

    const saveSetting = async (setting: StoredSetting) => {
        try {
            const payload = {
                sourceUrl: setting.source_url,
                settings: setting.settings,
                expectedEvents: setting.settings.expectedEvents, // <-- Added here
            };
            const res = await fetch(`${API_URL}/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('Failed to save setting');
            const saved = await res.json();
            setSettingsList(prev =>
                prev.map(s => (s.source_url === saved.source_url ? saved : s))
            );
            toggleEdit(setting.id); // exit edit mode
            toggleExpand(setting.id); // collapse card
        } catch (err: any) {
            alert(err.message || 'Error saving setting');
        }
    };

    const deleteSetting = async (setting: StoredSetting) => {
        if (window.confirm(`Are you sure you want to delete settings for ${setting.source_url}?`)) {
            try {
                const res = await fetch(`${API_URL}/settings?sourceUrl=${encodeURIComponent(setting.source_url)}`, {
                    method: 'DELETE'
                });
                if (!res.ok) throw new Error('Failed to delete setting');
                setSettingsList(prev => prev.filter(s => s.id !== setting.id));
            } catch (err: any) {
                alert(err.message || 'Error deleting setting');
            }
        }
    };

    const addNewSetting = () => {
        // Get the default settings from the central configuration
        console.log("Using DEFAULT_SETTINGS from config:", DEFAULT_SETTINGS);
        
        setNewRecord({
            id: Date.now(), // Use timestamp as temporary ID
            source_url: '',
            settings: {
                ...DEFAULT_SETTINGS,
                // Ensure customPrompt is explicitly set to avoid any issues
                customPrompt: DEFAULT_SETTINGS.customPrompt,
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
        
        console.log("New record created with prompt from config:", DEFAULT_SETTINGS.customPrompt);
    };

    const saveNewSetting = async () => {
        if (newRecord) {
            try {
                // If customPrompt is empty, set the default prompt from the config
                if (!newRecord.settings.customPrompt) {
                    newRecord.settings.customPrompt = DEFAULT_SETTINGS.customPrompt;
                }
                
                const payload = {
                    sourceUrl: newRecord.source_url,
                    settings: newRecord.settings,
                    expectedEvents: newRecord.settings.expectedEvents,
                };
                
                console.log("Saving record with prompt from config:", newRecord.settings.customPrompt);
                
                const res = await fetch(`${API_URL}/settings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (!res.ok) throw new Error('Failed to save new setting');
                const saved = await res.json();
                setSettingsList(prev => [...prev, saved]);
                setNewRecord(null);
                
                // Show success message
                alert("Settings saved successfully!");
            } catch (err: any) {
                alert(err.message || 'Error saving new setting');
            }
        }
    };

    // In the read-only preview, show a compact summary with an Edit button.
    const renderPreviewView = (setting: StoredSetting) => (
        <div className="p-4">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                    <dt className="text-xs font-semibold text-gray-600">Source URL</dt>
                    <dd className="text-sm text-gray-800">{setting.source_url}</dd>
                </div>
                <div>
                    <dt className="text-xs font-semibold text-gray-600">Min Text Length</dt>
                    <dd className="text-sm text-gray-800">{setting.settings.minTextLength}</dd>
                </div>
                <div>
                    <dt className="text-xs font-semibold text-gray-600">Max Text Length</dt>
                    <dd className="text-sm text-gray-800">{setting.settings.maxTextLength}</dd>
                </div>
                <div>
                    <dt className="text-xs font-semibold text-gray-600">Max Combined Size</dt>
                    <dd className="text-sm text-gray-800">{setting.settings.maxCombinedSize}</dd>
                </div>
                <div>
                    <dt className="text-xs font-semibold text-gray-600">Category Set</dt>
                    <dd className="text-sm text-gray-800">{setting.settings.categorySet}</dd>
                </div>
                <div>
                    <dt className="text-xs font-semibold text-gray-600">GPT Model</dt>
                    <dd className="text-sm text-gray-800">{setting.settings.gptModel}</dd>
                </div>
                {setting.settings.expectedEvents !== undefined && (
                    <div>
                        <dt className="text-xs font-semibold text-gray-600">Expected Events</dt>
                        <dd className="text-sm text-gray-800">{setting.settings.expectedEvents}</dd>
                    </div>
                )}
            </dl>
            <div className="mt-3 flex justify-end">
                <button
                    onClick={() => toggleEdit(setting.id)}
                    className="inline-flex items-center px-3 py-1 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white transition-colors"
                >
                    <Edit2 size={16} className="mr-1" />
                    Edit
                </button>
            </div>
        </div>
    );

    // Editable form: same as preview but with inputs.
    const renderEditForm = (setting: StoredSetting) => (
        <div className="p-4 space-y-4">
            <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Source URL</label>
                <input
                    type="url"
                    value={setting.source_url}
                    onChange={(e) => handleSourceUrlChange(setting.id, e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
            </div>
            <fieldset className="border border-gray-200 rounded-md p-3">
                <legend className="px-2 text-xs font-bold text-gray-700">Text Settings</legend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600">Min Text Length</label>
                        <input
                            type="number"
                            value={setting.settings.minTextLength}
                            onChange={(e) => handleFieldChange(setting.id, 'minTextLength', Number(e.target.value))}
                            className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600">Max Text Length</label>
                        <input
                            type="number"
                            value={setting.settings.maxTextLength}
                            onChange={(e) => handleFieldChange(setting.id, 'maxTextLength', Number(e.target.value))}
                            className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600">Max Combined Size</label>
                        <input
                            type="number"
                            value={setting.settings.maxCombinedSize}
                            onChange={(e) => handleFieldChange(setting.id, 'maxCombinedSize', Number(e.target.value))}
                            className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>
                </div>
            </fieldset>
            <fieldset className="border border-gray-200 rounded-md p-3 mt-4">
                <legend className="px-2 text-xs font-bold text-gray-700">Event & Model Settings</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600">Category Set</label>
                        <input
                            type="text"
                            value={setting.settings.categorySet}
                            onChange={(e) => handleFieldChange(setting.id, 'categorySet', e.target.value)}
                            className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600">GPT Model</label>
                        <input
                            type="text"
                            value={setting.settings.gptModel}
                            onChange={(e) => handleFieldChange(setting.id, 'gptModel', e.target.value)}
                            className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600">Expected Events</label>
                        <input
                            type="number"
                            value={setting.settings.expectedEvents}
                            onChange={(e) => handleFieldChange(setting.id, 'expectedEvents', Number(e.target.value))}
                            className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>
                </div>
                <div className="mt-3 space-y-1">
                    <label className="text-xs font-semibold text-gray-600">Custom Prompt</label>
                    <textarea
                        value={setting.settings.customPrompt}
                        onChange={(e) => handleFieldChange(setting.id, 'customPrompt', e.target.value)}
                        className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                        rows={3}
                    />
                </div>
            </fieldset>
            <div className="flex flex-col sm:flex-row items-center justify-between mt-4 space-y-3 sm:space-y-0">
                <div className="flex items-center space-x-3">
                    <label className="text-xs font-semibold text-gray-600">Show Events Without Links</label>
                    <input
                        type="checkbox"
                        checked={setting.settings.showEventsWithoutLinks}
                        onChange={(e) => handleFieldChange(setting.id, 'showEventsWithoutLinks', e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                </div>
                <div className="flex items-center space-x-3">
                    <label className="text-xs font-semibold text-gray-600">Iterate Iframes</label>
                    <input
                        type="checkbox"
                        checked={setting.settings.iterateIframes}
                        onChange={(e) => handleFieldChange(setting.id, 'iterateIframes', e.target.checked)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                </div>
            </div>
            <div className="mt-4 flex justify-between items-center">
                <div className="flex space-x-3">
                    <button
                        onClick={() => toggleEdit(setting.id)}
                        className="inline-flex items-center px-3 py-1 border border-gray-400 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
                    >
                        <X size={16} className="mr-1" />
                        Cancel
                    </button>
                    <button
                        onClick={() => saveSetting(setting)}
                        className="inline-flex items-center px-3 py-1 border border-green-600 text-green-600 rounded-md hover:bg-green-600 hover:text-white transition-colors"
                    >
                        <RefreshCw size={16} className="mr-1" />
                        Save
                    </button>
                </div>
                <button
                    onClick={() => deleteSetting(setting)}
                    className="inline-flex items-center px-3 py-1 border border-red-600 text-red-600 rounded-md hover:bg-red-600 hover:text-white transition-colors"
                >
                    <X size={16} className="mr-1" />
                    Delete
                </button>
            </div>
        </div>
    );

    const renderSettingRow = (setting: StoredSetting) => (
        <div key={setting.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div
                className="flex items-center justify-between px-6 py-4 cursor-pointer border-b border-gray-100"
                onClick={() => toggleExpand(setting.id)}
            >
                <div className="flex flex-col">
                    <h3 className="font-medium text-gray-900">{setting.source_url}</h3>
                    <span className="text-xs text-gray-500">
                        {new Date(setting.updated_at).toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: '2-digit', 
                            year: 'numeric'
                        })} • {setting.settings.gptModel} • 
                        {setting.settings.expectedEvents ? ` Erwartet: ${setting.settings.expectedEvents} Events` : ' Keine erwarteten Events definiert'}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    {!expandedIds.has(setting.id) && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleEdit(setting.id);
                                toggleExpand(setting.id);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                        >
                            <Edit2 size={16} />
                        </button>
                    )}
                    <div className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
                        {expandedIds.has(setting.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </div>
                </div>
            </div>
            
            {expandedIds.has(setting.id) && (
                <div className="bg-gray-50 border-b border-gray-200">
                    {editingIds.has(setting.id) ? renderEditForm(setting) : renderPreviewView(setting)}
                </div>
            )}
            
            {expandedIds.has(setting.id) && (
                <div className="px-6 py-4">
                    <div
                        className="flex items-center justify-between cursor-pointer mb-2"
                        onClick={() => toggleScoringExpand(setting.id, setting.source_url)}
                    >
                        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                            </svg>
                            Extraktionsleistung
                        </h4>
                        <div className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
                            {scoringExpandedIds.has(setting.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </div>
                    </div>
                    
                    {scoringExpandedIds.has(setting.id) && (
                        <div className="mt-3 space-y-4 bg-white p-4 rounded-lg border border-gray-200">
                            {scoringResults[setting.id] && scoringResults[setting.id].length > 0 ? (
                                scoringResults[setting.id].map(result => (
                                    <div key={result.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-8 w-8 rounded-full ${getScoreColor(result.score_data.score)} flex items-center justify-center text-white font-medium`}>
                                                    {(result.score_data.score * 100).toFixed(0)}%
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(result.calculated_at).toLocaleString('de-DE', {
                                                            day: '2-digit',
                                                            month: '2-digit',
                                                            year: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => saveSetting({ ...setting, settings: result.score_data.settings! })}
                                                className="inline-flex items-center px-3 py-1 text-sm border border-blue-500 text-blue-500 rounded-md hover:bg-blue-500 hover:text-white transition-colors"
                                            >
                                                <RefreshCw size={14} className="mr-1" />
                                                Einstellungen übernehmen
                                            </button>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                            <div className="bg-gray-50 p-2 rounded flex justify-between">
                                                <span className="text-gray-500">Genauigkeit:</span>
                                                <span className="font-medium">{(result.score_data.accuracy * 100).toFixed(0)}%</span>
                                            </div>
                                            <div className="bg-gray-50 p-2 rounded flex justify-between">
                                                <span className="text-gray-500">Vollständigkeit:</span>
                                                <span className="font-medium">{(result.score_data.completeness * 100).toFixed(0)}%</span>
                                            </div>
                                            <div className="bg-gray-50 p-2 rounded flex justify-between">
                                                <span className="text-gray-500">Gefundene Events:</span>
                                                <span className="font-medium">{result.score_data.scraped}</span>
                                            </div>
                                            <div className="bg-gray-50 p-2 rounded flex justify-between">
                                                <span className="text-gray-500">Erwartete Events:</span>
                                                <span className="font-medium">{result.score_data.expected}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-6">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    <p className="text-sm text-gray-500">Keine Leistungsdaten verfügbar.</p>
                                    <p className="text-xs text-gray-400 mt-1">Leistungsmetriken werden nach Extraktionsläufen angezeigt.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    // Move the hook to the component level to follow React Hooks rules
    const [newFormActiveTab, setNewFormActiveTab] = useState<'basic' | 'advanced'>('basic');

    // Filter settings based on search query
    const filteredSettings = settingsList.filter(setting => 
        setting.source_url.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    const renderNewRecordForm = () => {
        return (
            <div className="bg-white border border-gray-200 rounded-lg shadow-md mt-8 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                            <Plus size={16} className="text-white" />
                        </div>
                        <h3 className="font-medium text-white">Neue Konfiguration erstellen</h3>
                    </div>
                    <button 
                        onClick={() => setNewRecord(null)} 
                        className="text-white hover:bg-white hover:bg-opacity-20 p-1.5 rounded-full transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
                
                {/* Tabs - Redesigned as a toggle switch */}
                <div className="bg-white pt-6 px-6">
                    <div className="flex justify-center">
                        <div className="inline-flex p-1 bg-gray-100 rounded-full">
                            <button
                                onClick={() => setNewFormActiveTab('basic')}
                                className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                                    newFormActiveTab === 'basic' 
                                    ? 'bg-blue-600 text-white shadow-sm' 
                                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                                }`}
                            >
                                Grundeinstellungen
                            </button>
                            <button
                                onClick={() => setNewFormActiveTab('advanced')}
                                className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                                    newFormActiveTab === 'advanced' 
                                    ? 'bg-blue-600 text-white shadow-sm' 
                                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                                }`}
                            >
                                Erweiterte Einstellungen
                            </button>
                        </div>
                    </div>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Source URL - Always visible */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quell-URL</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                            </div>
                            <input
                                type="url"
                                value={newRecord!.source_url}
                                onChange={(e) => setNewRecord({ ...newRecord!, source_url: e.target.value })}
                                placeholder="https://example.com/events"
                                className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>
                    </div>
                    
                    {/* Tab content with smoother transition */}
                    <div className="transition-all duration-300 ease-in-out">
                        {newFormActiveTab === 'basic' && (
                            <div className="bg-white rounded-lg p-6 border border-gray-100 shadow-sm">
                                <div className="flex items-center mb-4">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-800">Grundeinstellungen für die Extraktion</h3>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Min. Textlänge</label>
                                        <input
                                            type="number"
                                            value={newRecord!.settings.minTextLength}
                                            onChange={(e) => setNewRecord({
                                                ...newRecord!,
                                                settings: { ...newRecord!.settings, minTextLength: Number(e.target.value) },
                                            })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Erwartete Events</label>
                                        <input
                                            type="number"
                                            value={newRecord!.settings.expectedEvents}
                                            onChange={(e) => setNewRecord({
                                                ...newRecord!,
                                                settings: { ...newRecord!.settings, expectedEvents: Number(e.target.value) },
                                            })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">GPT-Modell</label>
                                        <select
                                            value={newRecord!.settings.gptModel}
                                            onChange={(e) => setNewRecord({
                                                ...newRecord!,
                                                settings: { ...newRecord!.settings, gptModel: e.target.value },
                                            })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="gpt-4o-mini">GPT-4o Mini</option>
                                            <option value="gpt-4o">GPT-4o</option>
                                            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <h4 className="text-sm font-medium text-gray-700 mb-3">Zusätzliche Optionen</h4>
                                    <div className="flex flex-col sm:flex-row gap-6">
                                        <div className="flex items-center">
                                            <input
                                                id="showEventsWithoutLinks"
                                                type="checkbox"
                                                checked={newRecord!.settings.showEventsWithoutLinks}
                                                onChange={(e) => setNewRecord({
                                                    ...newRecord!,
                                                    settings: { ...newRecord!.settings, showEventsWithoutLinks: e.target.checked },
                                                })}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor="showEventsWithoutLinks" className="ml-2 block text-sm text-gray-700">
                                                Events ohne Links anzeigen
                                            </label>
                                        </div>
                                        <div className="flex items-center">
                                            <input
                                                id="iterateIframes"
                                                type="checkbox"
                                                checked={newRecord!.settings.iterateIframes}
                                                onChange={(e) => setNewRecord({
                                                    ...newRecord!,
                                                    settings: { ...newRecord!.settings, iterateIframes: e.target.checked },
                                                })}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor="iterateIframes" className="ml-2 block text-sm text-gray-700">
                                                Iframes durchsuchen
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {newFormActiveTab === 'advanced' && (
                            <div className="bg-white rounded-lg p-6 border border-gray-100 shadow-sm">
                                <div className="flex items-center mb-4">
                                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-800">Erweiterte Konfiguration</h3>
                                </div>

                                <div className="mb-6">
                                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded-r-md">
                                        <div className="flex">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <p className="text-sm text-blue-700">Diese Einstellungen beeinflussen die Art und Weise der Textverarbeitung für die Extraktion.</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Textverarbeitungseinstellungen</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Min. Textlänge</label>
                                            <input
                                                type="number"
                                                value={newRecord!.settings.minTextLength}
                                                onChange={(e) => setNewRecord({
                                                    ...newRecord!,
                                                    settings: { ...newRecord!.settings, minTextLength: Number(e.target.value) },
                                                })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            <p className="mt-1 text-xs text-gray-500">Minimale Zeichenanzahl für Textelemente</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Max. Textlänge</label>
                                            <input
                                                type="number"
                                                value={newRecord!.settings.maxTextLength}
                                                onChange={(e) => setNewRecord({
                                                    ...newRecord!,
                                                    settings: { ...newRecord!.settings, maxTextLength: Number(e.target.value) },
                                                })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            <p className="mt-1 text-xs text-gray-500">Maximale Zeichenanzahl für einzelne Textelemente</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Max. kombinierte Größe</label>
                                            <input
                                                type="number"
                                                value={newRecord!.settings.maxCombinedSize}
                                                onChange={(e) => setNewRecord({
                                                    ...newRecord!,
                                                    settings: { ...newRecord!.settings, maxCombinedSize: Number(e.target.value) },
                                                })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            <p className="mt-1 text-xs text-gray-500">Maximale kombinierte Größe bei Zusammenführung von Textelementen</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Event-Extraktionseinstellungen</h3>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">GPT-Modell</label>
                                        <select
                                            value={newRecord!.settings.gptModel}
                                            onChange={(e) => setNewRecord({
                                                ...newRecord!,
                                                settings: { ...newRecord!.settings, gptModel: e.target.value },
                                            })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 mb-4"
                                        >
                                            <option value="gpt-4o-mini">GPT-4o Mini</option>
                                            <option value="gpt-4o">GPT-4o</option>
                                            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                        </select>
                                        
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Kategorien</label>
                                        <textarea
                                            value={newRecord!.settings.categorySet}
                                            onChange={(e) => setNewRecord({
                                                ...newRecord!,
                                                settings: { ...newRecord!.settings, categorySet: e.target.value },
                                            })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                            rows={2}
                                        />
                                        <p className="mt-1 mb-4 text-xs text-gray-500">Kommagetrennte Liste von Kategorien für die Klassifizierung von Events</p>
                                        
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Custom Prompt</label>
                                        <div className="relative">
                                            <textarea
                                                value={newRecord!.settings.customPrompt}
                                                onChange={(e) => setNewRecord({
                                                    ...newRecord!,
                                                    settings: { 
                                                        ...newRecord!.settings, 
                                                        customPrompt: e.target.value || DEFAULT_SETTINGS.customPrompt 
                                                    },
                                                })}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                                                rows={6}
                                            />
                                        </div>
                                        {!newRecord!.settings.customPrompt && (
                                            <div className="flex items-start mt-2">
                                                <div className="flex-shrink-0">
                                                    <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                                <p className="ml-2 text-sm text-blue-600">
                                                    Standard-Prompt aus Systemeinstellungen wird verwendet
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="mb-4 bg-gray-50 p-4 rounded-lg">
                                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Zusätzliche Optionen</h3>
                                    <div className="flex flex-wrap gap-6">
                                        <div className="flex items-center">
                                            <input
                                                id="showEventsWithoutLinks2"
                                                type="checkbox"
                                                checked={newRecord!.settings.showEventsWithoutLinks}
                                                onChange={(e) => setNewRecord({
                                                    ...newRecord!,
                                                    settings: { ...newRecord!.settings, showEventsWithoutLinks: e.target.checked },
                                                })}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor="showEventsWithoutLinks2" className="ml-2 block text-sm text-gray-700">
                                                Events ohne Links anzeigen
                                            </label>
                                        </div>
                                        <div className="flex items-center">
                                            <input
                                                id="iterateIframes2"
                                                type="checkbox"
                                                checked={newRecord!.settings.iterateIframes}
                                                onChange={(e) => setNewRecord({
                                                    ...newRecord!,
                                                    settings: { ...newRecord!.settings, iterateIframes: e.target.checked },
                                                })}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                            />
                                            <label htmlFor="iterateIframes2" className="ml-2 block text-sm text-gray-700">
                                                Iframes durchsuchen
                                            </label>
                                        </div>
                                        <div className="flex items-center">
                                            <input
                                                id="expectedEvents"
                                                type="number"
                                                value={newRecord!.settings.expectedEvents}
                                                onChange={(e) => setNewRecord({
                                                    ...newRecord!,
                                                    settings: { ...newRecord!.settings, expectedEvents: Number(e.target.value) },
                                                })}
                                                className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                            />
                                            <label htmlFor="expectedEvents" className="ml-2 block text-sm text-gray-700">
                                                Erwartete Anzahl Events
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex justify-between pt-6 border-t border-gray-200">
                        <button
                            onClick={() => setNewRecord(null)}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                        >
                            Abbrechen
                        </button>
                        <button
                            onClick={saveNewSetting}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                        >
                            Konfiguration speichern
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6" style={{ height: '650px', overflow: 'auto' }}>
            <div className="flex flex-col gap-6 mb-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">Gespeicherte Einstellungen</h2>
                        <p className="text-sm text-gray-500 mt-1">Verwalte und verwende deine benutzerdefinierten Extraktionskonfigurationen</p>
                    </div>
                    <button
                        onClick={addNewSetting}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
                    >
                        <Plus size={18} />
                        <span>Neue Einstellung</span>
                    </button>
                </div>
                
                <div className="space-y-2">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <input
                            type="search"
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Suche nach URLs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                onClick={() => setSearchQuery('')}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 hover:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                    {searchQuery && (
                        <div className="flex items-center text-sm text-gray-500">
                            <span className="inline-flex items-center justify-center px-2 py-1 mr-2 text-xs font-bold leading-none text-blue-100 bg-blue-600 rounded-full">
                                {filteredSettings.length}
                            </span>
                            {filteredSettings.length === 1 ? 'Einstellung' : 'Einstellungen'} gefunden für "{searchQuery}"
                        </div>
                    )}
                </div>
            </div>
            
            {loading ? (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
                </div>
            ) : error ? (
                <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <h4 className="font-medium">Fehler beim Laden der Einstellungen</h4>
                    </div>
                    <p className="text-sm ml-7">{error}</p>
                </div>
            ) : settingsList.length === 0 && !newRecord && !searchQuery ? (
                <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-12 text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Noch keine gespeicherten Einstellungen</h3>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">Speichere deine Extraktionskonfigurationen, um sie in verschiedenen Sitzungen wiederzuverwenden.</p>
                    <button
                        onClick={addNewSetting}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                        <Plus size={18} />
                        Erste Einstellung erstellen
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {filteredSettings.length > 0 ? (
                        filteredSettings.map((setting) => renderSettingRow(setting))
                    ) : searchQuery ? (
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-700 mb-2">Keine Ergebnisse gefunden</h3>
                            <p className="text-gray-500 mb-4">Keine Einstellungen für <span className="font-medium">"{searchQuery}"</span> gefunden.</p>
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Suche zurücksetzen
                            </button>
                        </div>
                    ) : (
                        settingsList.map((setting) => renderSettingRow(setting))
                    )}
                </div>
            )}
            
            {newRecord && renderNewRecordForm()}
        </div>
    );
}

export default StoredSettingsTab;