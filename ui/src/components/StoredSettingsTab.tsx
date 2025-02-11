import  { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, RefreshCw, X, Edit2, Plus } from 'lucide-react';
import type { AdvancedSettings } from '../App';
import {API_URL} from "../config.ts";

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

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/settings-all`);
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
        setNewRecord({
            id: 0,
            source_url: '',
            settings: {
                minTextLength: 25,
                maxTextLength: 4000,
                maxCombinedSize: 4000,
                categorySet:
                    "Familienleben, Aktivitäten, Veranstaltungen, Essen/Rezepte, Münsterland, Kultur/Lifestyle, Gesundheit, Reisen, Einkaufen, Gemeinschaft, Tipps & Ratgeber",
                customPrompt: '',
                gptModel: 'gpt-4o-mini',
                showEventsWithoutLinks: false,
                iterateIframes: false,
                expectedEvents: 0,
            },
            created_at: '',
            updated_at: '',
        });
    };

    const saveNewSetting = async () => {
        if (newRecord) {
            try {
                const payload = {
                    sourceUrl: newRecord.source_url,
                    settings: newRecord.settings,
                    expectedEvents: newRecord.settings.expectedEvents, // <-- Added here
                };
                const res = await fetch(`${API_URL}/settings`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (!res.ok) throw new Error('Failed to save new setting');
                const saved = await res.json();
                setSettingsList(prev => [...prev, saved]);
                setNewRecord(null);
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
        <div key={setting.id} className="border rounded-md shadow-sm overflow-hidden mb-6">
            <div
                className="flex items-center justify-between bg-gray-100 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-200"
                onClick={() => toggleExpand(setting.id)}
            >
                <span className="font-bold text-gray-800">{setting.source_url}</span>
                {expandedIds.has(setting.id) ? <ChevronUp /> : <ChevronDown />}
            </div>
            {expandedIds.has(setting.id) &&
                (editingIds.has(setting.id) ? renderEditForm(setting) : renderPreviewView(setting))}
            {expandedIds.has(setting.id) && (
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
                                        <div className="flex items-center justify-around">
                                            <span className="font-medium text-gray-700">Score:</span>
                                            <span className={`px-2 py-1 rounded text-white ${getScoreColor(result.score_data.score)}`}>
                        {(result.score_data.score * 100).toFixed(0)}%
                      </span>
                                        </div>
                                        <div className="mt-1 text-xs text-gray-600">
                                            Accuracy: {(result.score_data.accuracy * 100).toFixed(0)}%, Completeness: {(result.score_data.completeness * 100).toFixed(0)}%
                                        </div>
                                        <div className="mt-1 text-xs text-gray-500">
                                            Calculated At: {new Date(result.calculated_at).toLocaleString()}
                                        </div>
                                        {result.score_data.settings && (
                                            <div className="mt-3 space-y-2">
                        <pre className="p-2 bg-gray-50 border rounded text-xs overflow-x-auto">
                          {JSON.stringify(result.score_data.settings, null, 2)}
                        </pre>
                                                {/* Call saveSetting using the current setting with its settings replaced by the scoring result settings */}
                                                <button
                                                    onClick={() => saveSetting({ ...setting, settings: result.score_data.settings! })}
                                                    className="inline-flex items-center px-3 py-1 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white transition-colors focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <RefreshCw size={16} className="mr-1" />
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
            )}
        </div>
    );

    const renderNewRecordForm = () => (
        <div className="border rounded-md mt-6 shadow-sm">
            <div className="flex items-center justify-between bg-green-100 px-4 py-3">
                <span className="font-bold text-gray-800">New Setting</span>
                <button onClick={() => setNewRecord(null)} className="text-gray-600 hover:text-gray-800">
                    <X size={20} />
                </button>
            </div>
            <div className="p-4 space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600">Source URL</label>
                    <input
                        type="url"
                        value={newRecord!.source_url}
                        onChange={(e) => setNewRecord({ ...newRecord!, source_url: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600">Min Text Length</label>
                        <input
                            type="number"
                            value={newRecord!.settings.minTextLength}
                            onChange={(e) =>
                                setNewRecord({
                                    ...newRecord!,
                                    settings: { ...newRecord!.settings, minTextLength: Number(e.target.value) },
                                })
                            }
                            className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600">Max Text Length</label>
                        <input
                            type="number"
                            value={newRecord!.settings.maxTextLength}
                            onChange={(e) =>
                                setNewRecord({
                                    ...newRecord!,
                                    settings: { ...newRecord!.settings, maxTextLength: Number(e.target.value) },
                                })
                            }
                            className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600">Max Combined Size</label>
                        <input
                            type="number"
                            value={newRecord!.settings.maxCombinedSize}
                            onChange={(e) =>
                                setNewRecord({
                                    ...newRecord!,
                                    settings: { ...newRecord!.settings, maxCombinedSize: Number(e.target.value) },
                                })
                            }
                            className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600">Category Set</label>
                        <input
                            type="text"
                            value={newRecord!.settings.categorySet}
                            onChange={(e) =>
                                setNewRecord({
                                    ...newRecord!,
                                    settings: { ...newRecord!.settings, categorySet: e.target.value },
                                })
                            }
                            className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600">GPT Model</label>
                        <input
                            type="text"
                            value={newRecord!.settings.gptModel}
                            onChange={(e) =>
                                setNewRecord({
                                    ...newRecord!,
                                    settings: { ...newRecord!.settings, gptModel: e.target.value },
                                })
                            }
                            className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600">Expected Events</label>
                        <input
                            type="number"
                            value={newRecord!.settings.expectedEvents}
                            onChange={(e) =>
                                setNewRecord({
                                    ...newRecord!,
                                    settings: { ...newRecord!.settings, expectedEvents: Number(e.target.value) },
                                })
                            }
                            className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600">Custom Prompt</label>
                    <textarea
                        value={newRecord!.settings.customPrompt}
                        onChange={(e) =>
                            setNewRecord({
                                ...newRecord!,
                                settings: { ...newRecord!.settings, customPrompt: e.target.value },
                            })
                        }
                        className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                        rows={3}
                    />
                </div>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-gray-600">Show Events Without Links</span>
                        <input
                            type="checkbox"
                            checked={newRecord!.settings.showEventsWithoutLinks}
                            onChange={(e) =>
                                setNewRecord({
                                    ...newRecord!,
                                    settings: { ...newRecord!.settings, showEventsWithoutLinks: e.target.checked },
                                })
                            }
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-gray-600">Iterate Iframes</span>
                        <input
                            type="checkbox"
                            checked={newRecord!.settings.iterateIframes}
                            onChange={(e) =>
                                setNewRecord({
                                    ...newRecord!,
                                    settings: { ...newRecord!.settings, iterateIframes: e.target.checked },
                                })
                            }
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                    </div>
                </div>
                <div className="flex justify-end space-x-4 mt-4">
                    <button
                        onClick={saveNewSetting}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-400 transition-colors"
                    >
                        Save
                    </button>
                    <button
                        onClick={() => setNewRecord(null)}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:ring-2 focus:ring-red-400 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
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
            {newRecord && renderNewRecordForm()}
        </div>
    );
}

export default StoredSettingsTab;