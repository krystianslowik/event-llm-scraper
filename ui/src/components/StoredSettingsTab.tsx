// StoredSettingsTab.tsx
import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import type { AdvancedSettings } from '../App';

interface StoredSetting {
    id: number;
    source_url: string;
    settings: AdvancedSettings;
    created_at: string;
    updated_at: string;
}

export function StoredSettingsTab() {
    const [settingsList, setSettingsList] = useState<StoredSetting[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
    const [newRecord, setNewRecord] = useState<StoredSetting | null>(null);

    // Fetch stored settings from the backend
    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await fetch('http://localhost:3000/settings-all');
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

    // Toggle expansion of an accordion row
    const toggleExpand = (id: number) => {
        setExpandedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    // Update a field of a stored setting
    const handleFieldChange = (id: number, field: keyof AdvancedSettings, value: any) => {
        setSettingsList(prev =>
            prev.map(setting =>
                setting.id === id ? { ...setting, settings: { ...setting.settings, [field]: value } } : setting
            )
        );
    };

    // Update the source URL for a stored setting
    const handleSourceUrlChange = (id: number, value: string) => {
        setSettingsList(prev =>
            prev.map(setting => (setting.id === id ? { ...setting, source_url: value } : setting))
        );
    };

    // Save changes for an existing stored setting
    const saveSetting = async (setting: StoredSetting) => {
        try {
            const payload = {
                sourceUrl: setting.source_url,
                settings: setting.settings,
            };
            const res = await fetch('http://localhost:3000/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('Failed to save setting');
            const saved = await res.json();
            setSettingsList(prev =>
                prev.map(s => (s.source_url === saved.source_url ? saved : s))
            );
            toggleExpand(setting.id); // collapse row after saving
        } catch (err: any) {
            alert(err.message || 'Error saving setting');
        }
    };

    // Delete a stored setting
    const deleteSetting = async (setting: StoredSetting) => {
        if (window.confirm(`Are you sure you want to delete settings for ${setting.source_url}?`)) {
            try {
                const res = await fetch(
                    `http://localhost:3000/settings?sourceUrl=${encodeURIComponent(setting.source_url)}`,
                    { method: 'DELETE' }
                );
                if (!res.ok) throw new Error('Failed to delete setting');
                setSettingsList(prev => prev.filter(s => s.id !== setting.id));
            } catch (err: any) {
                alert(err.message || 'Error deleting setting');
            }
        }
    };

    // Prepare a new record when adding a new setting
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
            },
            created_at: '',
            updated_at: '',
        });
    };

    // Save the new setting record
    const saveNewSetting = async () => {
        if (newRecord) {
            try {
                const payload = {
                    sourceUrl: newRecord.source_url,
                    settings: newRecord.settings,
                };
                const res = await fetch('http://localhost:3000/settings', {
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

    // Render a single stored setting row (accordion style)
    const renderSettingRow = (setting: StoredSetting) => (
        <div key={setting.id} className="border rounded-md">
            <div
                className="flex items-center justify-between bg-gray-100 px-4 py-2 cursor-pointer"
                onClick={() => toggleExpand(setting.id)}
            >
                <span className="font-semibold text-gray-800">{setting.source_url}</span>
                {expandedIds.has(setting.id) ? <ChevronUp /> : <ChevronDown />}
            </div>
            {expandedIds.has(setting.id) && (
                <div className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Source URL</label>
                        <input
                            type="url"
                            value={setting.source_url}
                            onChange={(e) => handleSourceUrlChange(setting.id, e.target.value)}
                            className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Min Text Length</label>
                            <input
                                type="number"
                                value={setting.settings.minTextLength}
                                onChange={(e) =>
                                    handleFieldChange(setting.id, 'minTextLength', Number(e.target.value))
                                }
                                className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Max Text Length</label>
                            <input
                                type="number"
                                value={setting.settings.maxTextLength}
                                onChange={(e) =>
                                    handleFieldChange(setting.id, 'maxTextLength', Number(e.target.value))
                                }
                                className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Max Combined Size</label>
                            <input
                                type="number"
                                value={setting.settings.maxCombinedSize}
                                onChange={(e) =>
                                    handleFieldChange(setting.id, 'maxCombinedSize', Number(e.target.value))
                                }
                                className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Category Set</label>
                            <input
                                type="text"
                                value={setting.settings.categorySet}
                                onChange={(e) => handleFieldChange(setting.id, 'categorySet', e.target.value)}
                                className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">GPT Model</label>
                            <input
                                type="text"
                                value={setting.settings.gptModel}
                                onChange={(e) => handleFieldChange(setting.id, 'gptModel', e.target.value)}
                                className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Custom Prompt</label>
                        <textarea
                            value={setting.settings.customPrompt}
                            onChange={(e) => handleFieldChange(setting.id, 'customPrompt', e.target.value)}
                            className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                            rows={3}
                        />
                    </div>
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-700">Show Events Without Links</span>
                            <input
                                type="checkbox"
                                checked={setting.settings.showEventsWithoutLinks}
                                onChange={(e) =>
                                    handleFieldChange(setting.id, 'showEventsWithoutLinks', e.target.checked)
                                }
                                className="ml-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-700">Iterate Iframes</span>
                            <input
                                type="checkbox"
                                checked={setting.settings.iterateIframes}
                                onChange={(e) =>
                                    handleFieldChange(setting.id, 'iterateIframes', e.target.checked)
                                }
                                className="ml-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end space-x-4">
                        <button
                            onClick={() => saveSetting(setting)}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                            Save
                        </button>
                        <button
                            onClick={() => deleteSetting(setting)}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    // Render the new record form inline when adding a new setting.
    const renderNewRecordForm = () => (
        <div className="border rounded-md mt-4">
            <div className="flex items-center justify-between bg-green-100 px-4 py-2">
                <span className="font-semibold text-gray-800">New Setting</span>
                <button onClick={() => setNewRecord(null)} className="text-gray-600 hover:text-gray-800">
                    <X size={20} />
                </button>
            </div>
            <div className="p-4 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Source URL</label>
                    <input
                        type="url"
                        value={newRecord!.source_url}
                        onChange={(e) => setNewRecord({ ...newRecord!, source_url: e.target.value })}
                        className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Min Text Length</label>
                        <input
                            type="number"
                            value={newRecord!.settings.minTextLength}
                            onChange={(e) =>
                                setNewRecord({
                                    ...newRecord!,
                                    settings: { ...newRecord!.settings, minTextLength: Number(e.target.value) },
                                })
                            }
                            className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Max Text Length</label>
                        <input
                            type="number"
                            value={newRecord!.settings.maxTextLength}
                            onChange={(e) =>
                                setNewRecord({
                                    ...newRecord!,
                                    settings: { ...newRecord!.settings, maxTextLength: Number(e.target.value) },
                                })
                            }
                            className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Max Combined Size</label>
                        <input
                            type="number"
                            value={newRecord!.settings.maxCombinedSize}
                            onChange={(e) =>
                                setNewRecord({
                                    ...newRecord!,
                                    settings: { ...newRecord!.settings, maxCombinedSize: Number(e.target.value) },
                                })
                            }
                            className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Category Set</label>
                        <input
                            type="text"
                            value={newRecord!.settings.categorySet}
                            onChange={(e) =>
                                setNewRecord({
                                    ...newRecord!,
                                    settings: { ...newRecord!.settings, categorySet: e.target.value },
                                })
                            }
                            className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">GPT Model</label>
                        <input
                            type="text"
                            value={newRecord!.settings.gptModel}
                            onChange={(e) =>
                                setNewRecord({
                                    ...newRecord!,
                                    settings: { ...newRecord!.settings, gptModel: e.target.value },
                                })
                            }
                            className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Custom Prompt</label>
                    <textarea
                        value={newRecord!.settings.customPrompt}
                        onChange={(e) =>
                            setNewRecord({
                                ...newRecord!,
                                settings: { ...newRecord!.settings, customPrompt: e.target.value },
                            })
                        }
                        className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                    />
                </div>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-700">Show Events Without Links</span>
                        <input
                            type="checkbox"
                            checked={newRecord!.settings.showEventsWithoutLinks}
                            onChange={(e) =>
                                setNewRecord({
                                    ...newRecord!,
                                    settings: { ...newRecord!.settings, showEventsWithoutLinks: e.target.checked },
                                })
                            }
                            className="ml-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-700">Iterate Iframes</span>
                        <input
                            type="checkbox"
                            checked={newRecord!.settings.iterateIframes}
                            onChange={(e) =>
                                setNewRecord({
                                    ...newRecord!,
                                    settings: { ...newRecord!.settings, iterateIframes: e.target.checked },
                                })
                            }
                            className="ml-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                    </div>
                </div>
                <div className="flex justify-end space-x-4 mt-4">
                    <button
                        onClick={saveNewSetting}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                        Save
                    </button>
                    <button
                        onClick={() => setNewRecord(null)}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-4">
            <h2 className="text-xl font-semibold mb-4">Stored Settings</h2>
            <div className="mb-4 flex justify-end">
                <button
                    onClick={addNewSetting}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                    Add New Setting
                </button>
            </div>
            {loading ? (
                <p>Loading stored settings…</p>
            ) : error ? (
                <p className="text-red-600">Error: {error}</p>
            ) : settingsList.length === 0 && !newRecord ? (
                <p>No stored settings found.</p>
            ) : (
                <div className="space-y-4">
                    {settingsList.map((setting) => renderSettingRow(setting))}
                </div>
            )}
            {newRecord && renderNewRecordForm()}
        </div>
    );
}

export default StoredSettingsTab;