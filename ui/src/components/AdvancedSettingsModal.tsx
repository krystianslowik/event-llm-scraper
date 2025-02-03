// AdvancedSettingsModal.tsx
import React, { useMemo } from 'react';
import { X, Info } from 'lucide-react';
import type { AdvancedSettings } from '../App';

interface AdvancedSettingsModalProps {
    settings: AdvancedSettings;
    onChange: (newSettings: AdvancedSettings) => void;
    onClose: () => void;
}

// Define clear, written descriptions for each field
const fieldDescriptions: { [key in keyof AdvancedSettings]: string } = {
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
        "Der Name des GPT-Modells, das für die Textzusammenfassung verwendet wird (z. B. 'gpt-4o-mini')."
};

// Custom Tooltip component using Tailwind and group hover
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

export function AdvancedSettingsModal({
                                          settings,
                                          onChange,
                                          onClose
                                      }: AdvancedSettingsModalProps) {
    // Create a human-readable preview of the query parameters
    const queryPreview = useMemo(() => {
        const previewItems = [
            { label: 'Min Text Length', value: settings.minTextLength.toString() },
            { label: 'Max Text Length', value: settings.maxTextLength.toString() },
            { label: 'Max Combined Size', value: settings.maxCombinedSize.toString() },
            { label: 'Category Set', value: settings.categorySet },
            { label: 'GPT Model', value: settings.gptModel }
        ];
        if (settings.customPrompt.trim()) {
            previewItems.push({ label: 'Custom Prompt', value: settings.customPrompt });
        }
        return previewItems;
    }, [settings]);

    // Helper function to render an input field with a tooltip
    const renderField = (
        fieldKey: keyof AdvancedSettings,
        type: "text" | "number" | "textarea" = "text"
    ) => {
        const value = settings[fieldKey];
        const description = fieldDescriptions[fieldKey];
        // Map field keys to friendly labels
        const labelMap: { [key in keyof AdvancedSettings]: string } = {
            minTextLength: "Min Text Length",
            maxTextLength: "Max Text Length",
            maxCombinedSize: "Max Combined Size",
            categorySet: "Category Set",
            customPrompt: "Custom Prompt",
            gptModel: "GPT Model"
        };
        return (
            <div>
                <label className="block text-sm font-medium text-gray-700">
                    {labelMap[fieldKey]}
                    <Tooltip text={description}>
                        <Info size={12} className="text-gray-400 inline-block ml-1" />
                    </Tooltip>
                </label>
                {type === "textarea" ? (
                    <textarea
                        value={value as string}
                        onChange={(e) =>
                            onChange({ ...settings, [fieldKey]: e.target.value } as AdvancedSettings)
                        }
                        className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                    />
                ) : (
                    <input
                        type={type}
                        value={value as string | number}
                        onChange={(e) =>
                            onChange({
                                ...settings,
                                [fieldKey]: type === "number" ? Number(e.target.value) : e.target.value
                            } as AdvancedSettings)
                        }
                        className="mt-1 w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                )}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-auto p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-semibold text-gray-800">Erweiterte Einstellungen</h3>
                    <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
                        <X size={24} />
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {renderField("minTextLength", "number")}
                    {renderField("maxTextLength", "number")}
                    {renderField("maxCombinedSize", "number")}
                    {renderField("categorySet", "text")}
                    {renderField("customPrompt", "textarea")}
                    {renderField("gptModel", "text")}
                </div>

                {/* Human-readable Query Preview */}
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
            </div>
        </div>
    );
}