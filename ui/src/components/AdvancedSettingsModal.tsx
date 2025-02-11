/* Updated AdvancedSettingsModal.tsx */
import React, { useMemo, useState } from 'react';
import { X, Info } from 'lucide-react';
import type { AdvancedSettings } from '../App';
import { StoredSettingsTab } from './StoredSettingsTab';

interface AdvancedSettingsModalProps {
    settings: AdvancedSettings;
    onChange: (newSettings: AdvancedSettings) => void;
    onClose: () => void;
    // We'll use onChange as the restore callback
}

const fieldDescriptions: { [key in keyof AdvancedSettings]?: string } = {
    minTextLength:
        "Minimale Anzahl an Zeichen, die ein extrahierter Textabschnitt haben muss. Kürzere Abschnitte werden ignoriert.",
    maxTextLength:
        "Maximale Anzahl an Zeichen, die ein einzelner Textabschnitt enthalten darf. Längere Abschnitte werden in kleinere unterteilt.",
    maxCombinedSize:
        "Maximale Gesamtzahl an Zeichen, die erreicht wird, wenn kleinere Textabschnitte zusammengeführt werden.",
    categorySet:
        "Eine kommagetrennte Liste von Kategorien, in die ein Event einsortiert werden kann. Falls keine Kategorie passt, wird 'Andere' verwendet.",
    customPrompt:
        "Ein optionaler individueller Prompt, der dem GPT-Modell zusätzliche Anweisungen zur Zusammenfassung liefert.",
    gptModel:
        "Der Name des GPT-Modells, das für die Textzusammenfassung verwendet wird (z. B. 'gpt-4o-mini').",
    showEventsWithoutLinks:
        "Wenn aktiviert, werden auch Elemente ohne Links als Events extrahiert. Die URL wird dann auf die Hauptseite gesetzt.",
    iterateIframes:
        "Wenn aktiviert, wird der Inhalt aller Iframes geladen und dem Hauptinhalt hinzugefügt.",
    expectedEvents:
        "Die erwartete Anzahl an Events, falls bekannt. Dieser Wert wird zur Berechnung des Scores genutzt."
};

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
    return (
        <div className="relative inline-block group">
            {children}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-max max-w-xs px-2 py-1 bg-gray-700 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-10">
                {text}
            </div>
        </div>
    );
}

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: (value: boolean) => void; }) {
    return (
        <button
            type="button"
            onClick={() => onToggle(!enabled)}
            className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${enabled ? 'bg-blue-600' : 'bg-gray-300'}`}
        >
            <span className="sr-only">Toggle</span>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    );
}

export function AdvancedSettingsModal({ settings, onChange, onClose }: AdvancedSettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'default' | 'stored'>('default');

    const queryPreview = useMemo(() => {
        const previewItems = [
            { label: 'Min Text Length', value: settings.minTextLength.toString() },
            { label: 'Max Text Length', value: settings.maxTextLength.toString() },
            { label: 'Max Combined Size', value: settings.maxCombinedSize.toString() },
            { label: 'Category Set', value: settings.categorySet },
            { label: 'GPT Model', value: settings.gptModel },
            { label: 'Elemente ohne Links', value: settings.showEventsWithoutLinks ? 'Ja' : 'Nein' },
            { label: 'Iframe-Inhalt einbeziehen', value: settings.iterateIframes ? 'Ja' : 'Nein' },
        ];
        if (settings.customPrompt.trim()) {
            previewItems.push({ label: 'Custom Prompt', value: settings.customPrompt });
        }
        if (settings.expectedEvents !== undefined && settings.expectedEvents !== null) {
            previewItems.push({ label: 'Expected Events', value: settings.expectedEvents.toString() });
        }
        return previewItems;
    }, [settings]);

    const renderField = (
        fieldKey: keyof AdvancedSettings,
        type: 'text' | 'number' | 'textarea' = 'text'
    ) => {
        const value = settings[fieldKey];
        const description = fieldDescriptions[fieldKey] || '';
        const labelMap: { [key in keyof AdvancedSettings]?: string } = {
            minTextLength: 'Min Text Length',
            maxTextLength: 'Max Text Length',
            maxCombinedSize: 'Max Combined Size',
            categorySet: 'Category Set',
            customPrompt: 'Custom Prompt',
            gptModel: 'GPT Model',
            expectedEvents: 'Expected Events'
        };
        return (
            <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700">
                    {labelMap[fieldKey]}
                    <Tooltip text={description}>
                        <Info size={12} className="text-gray-400 inline-block ml-1" />
                    </Tooltip>
                </label>
                {type === 'textarea' ? (
                    <textarea
                        value={value as string}
                        onChange={(e) => onChange({ ...settings, [fieldKey]: e.target.value } as AdvancedSettings)}
                        className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                    />
                ) : (
                    <input
                        type={type}
                        value={value as string | number}
                        onChange={(e) =>
                            onChange({ ...settings, [fieldKey]: type === 'number' ? Number(e.target.value) : e.target.value } as AdvancedSettings)
                        }
                        className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                )}
            </div>
        );
    };

    const defaultSettingsForm = (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderField('minTextLength', 'number')}
                {renderField('maxTextLength', 'number')}
                {renderField('maxCombinedSize', 'number')}
                {renderField('categorySet', 'text')}
                {renderField('gptModel', 'text')}
                {renderField('expectedEvents', 'number')}
            </div>
            <div className="mt-4">{renderField('customPrompt', 'textarea')}</div>
            <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-700">Elemente ohne Links einbeziehen</span>
                    <Tooltip text={fieldDescriptions.showEventsWithoutLinks || ''}>
                        <Info size={12} className="text-gray-400 ml-1" />
                    </Tooltip>
                </div>
                <ToggleSwitch
                    enabled={settings.showEventsWithoutLinks}
                    onToggle={(value) => onChange({ ...settings, showEventsWithoutLinks: value })}
                />
            </div>
            <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-700">Iframe-Inhalt einbeziehen</span>
                    <Tooltip text={fieldDescriptions.iterateIframes || ''}>
                        <Info size={12} className="text-gray-400 ml-1" />
                    </Tooltip>
                </div>
                <ToggleSwitch
                    enabled={settings.iterateIframes}
                    onToggle={(value) => onChange({ ...settings, iterateIframes: value })}
                />
            </div>
            <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Query Preview</h4>
                <div className="bg-gray-100 p-4 rounded text-sm text-gray-700 max-h-48 overflow-y-auto whitespace-pre-wrap break-words">
                    {queryPreview.map(({ label, value }, idx) => (
                        <div key={idx} className="flex justify-between border-b border-gray-200 py-1 last:border-0">
                            <span className="font-medium">{label}:</span>
                            <span className="text-gray-600 ml-2">{value}</span>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    Diese Vorschau zeigt die aktuellen API-Parameter in einer lesbaren Form.
                </p>
            </div>
            <div className="mt-6 flex justify-end">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                    Speichern & Schließen
                </button>
            </div>
        </>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-4xl shadow-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-semibold text-gray-800">Erweiterte Einstellungen</h3>
                    <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
                        <X size={24} />
                    </button>
                </div>
                <div className="mb-4 border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('default')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'default'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Default Settings
                        </button>
                        <button
                            onClick={() => setActiveTab('stored')}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                                activeTab === 'stored'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Stored Settings & Scores
                        </button>
                    </nav>
                </div>
                {activeTab === 'default' ? defaultSettingsForm : <StoredSettingsTab onRestoreSettings={onChange} />}
            </div>
        </div>
    );
}