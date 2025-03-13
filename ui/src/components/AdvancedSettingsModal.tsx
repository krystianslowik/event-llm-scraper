import React, { useMemo, useState } from 'react';
import { X, Info } from 'lucide-react';
import type { AdvancedSettings } from '../App';
import { StoredSettingsTab } from './StoredSettingsTab';

interface AdvancedSettingsModalProps {
    settings: AdvancedSettings;
    onChange: (newSettings: AdvancedSettings) => void;
    onClose: () => void;
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
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-700 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-10">
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
            className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                enabled ? 'bg-blue-600' : 'bg-gray-300'
            }`}
        >
            <span className="sr-only">Toggle</span>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
    );
}

export function AdvancedSettingsModal({ settings, onChange, onClose }: AdvancedSettingsModalProps) {
    const [activeTab, setActiveTab] = useState<'default' | 'stored'>('default');
    const [activeSection, setActiveSection] = useState<'basic' | 'advanced'>('basic');

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
        // Use an empty string fallback in case customPrompt is null
        if ((settings.customPrompt || "").trim()) {
            previewItems.push({ label: 'Custom Prompt', value: settings.customPrompt });
        }
        if (settings.expectedEvents !== undefined && settings.expectedEvents !== null) {
            previewItems.push({ label: 'Expected Events', value: settings.expectedEvents.toString() });
        }
        return previewItems;
    }, [settings]);

    // Tooltip component for displaying help information
    const InfoTooltip = ({ text }: { text: string }) => (
        <Tooltip text={text}>
            <Info size={12} className="text-gray-400 inline-block ml-1" />
        </Tooltip>
    );

    // Basic settings section content
    const BasicSettingsContent = () => (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Min. Textlänge
                            <InfoTooltip text={fieldDescriptions.minTextLength || ""} />
                        </label>
                        <input
                            type="number"
                            value={settings.minTextLength}
                            onChange={(e) => onChange({ ...settings, minTextLength: Number(e.target.value) })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Erwartete Events
                            <InfoTooltip text={fieldDescriptions.expectedEvents || ""} />
                        </label>
                        <input
                            type="number"
                            value={settings.expectedEvents}
                            onChange={(e) => onChange({ ...settings, expectedEvents: Number(e.target.value) })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            GPT-Modell
                            <InfoTooltip text={fieldDescriptions.gptModel || ""} />
                        </label>
                        <select
                            value={settings.gptModel}
                            onChange={(e) => onChange({ ...settings, gptModel: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="gpt-4o-mini">GPT-4o Mini</option>
                            <option value="gpt-4o">GPT-4o</option>
                            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                        </select>
                    </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-6">
                    <div className="flex items-center">
                        <input
                            id="showEventsWithoutLinks"
                            type="checkbox"
                            checked={settings.showEventsWithoutLinks}
                            onChange={(e) => onChange({ ...settings, showEventsWithoutLinks: e.target.checked })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="showEventsWithoutLinks" className="ml-2 block text-sm text-gray-700">
                            Events ohne Links anzeigen
                            <InfoTooltip text={fieldDescriptions.showEventsWithoutLinks || ""} />
                        </label>
                    </div>
                    <div className="flex items-center">
                        <input
                            id="iterateIframes"
                            type="checkbox"
                            checked={settings.iterateIframes}
                            onChange={(e) => onChange({ ...settings, iterateIframes: e.target.checked })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="iterateIframes" className="ml-2 block text-sm text-gray-700">
                            Iframes durchsuchen
                            <InfoTooltip text={fieldDescriptions.iterateIframes || ""} />
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );

    // Advanced settings section content 
    const AdvancedSettingsContent = () => (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 space-y-6">
                <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Textverarbeitungseinstellungen</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Min. Textlänge
                                <InfoTooltip text={fieldDescriptions.minTextLength || ""} />
                            </label>
                            <input
                                type="number"
                                value={settings.minTextLength}
                                onChange={(e) => onChange({ ...settings, minTextLength: Number(e.target.value) })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="mt-1 text-xs text-gray-500">Minimale Zeichenanzahl für Textelemente</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Max. Textlänge
                                <InfoTooltip text={fieldDescriptions.maxTextLength || ""} />
                            </label>
                            <input
                                type="number"
                                value={settings.maxTextLength}
                                onChange={(e) => onChange({ ...settings, maxTextLength: Number(e.target.value) })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="mt-1 text-xs text-gray-500">Maximale Zeichenanzahl für einzelne Textelemente</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Max. kombinierte Größe
                                <InfoTooltip text={fieldDescriptions.maxCombinedSize || ""} />
                            </label>
                            <input
                                type="number"
                                value={settings.maxCombinedSize}
                                onChange={(e) => onChange({ ...settings, maxCombinedSize: Number(e.target.value) })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="mt-1 text-xs text-gray-500">Maximale kombinierte Größe bei Zusammenführung von Textelementen</p>
                        </div>
                    </div>
                </div>

                <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Event-Extraktionseinstellungen</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            GPT-Modell
                            <InfoTooltip text={fieldDescriptions.gptModel || ""} />
                        </label>
                        <select
                            value={settings.gptModel}
                            onChange={(e) => onChange({ ...settings, gptModel: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 mb-4"
                        >
                            <option value="gpt-4o-mini">GPT-4o Mini</option>
                            <option value="gpt-4o">GPT-4o</option>
                            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                        </select>
                        
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Kategorien
                            <InfoTooltip text={fieldDescriptions.categorySet || ""} />
                        </label>
                        <textarea
                            value={settings.categorySet}
                            onChange={(e) => onChange({ ...settings, categorySet: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            rows={2}
                        />
                        <p className="mt-1 mb-4 text-xs text-gray-500">Kommagetrennte Liste von Kategorien für die Klassifizierung von Events</p>
                        
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Custom Prompt
                            <InfoTooltip text={fieldDescriptions.customPrompt || ""} />
                        </label>
                        <div className="relative">
                            <textarea
                                value={settings.customPrompt}
                                onChange={(e) => onChange({ ...settings, customPrompt: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                                rows={6}
                            />
                        </div>
                    </div>
                </div>
                
                <div className="mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b">Zusätzliche Optionen</h3>
                    <div className="flex flex-wrap gap-6">
                        <div className="flex items-center">
                            <input
                                id="showEventsWithoutLinks2"
                                type="checkbox"
                                checked={settings.showEventsWithoutLinks}
                                onChange={(e) => onChange({ ...settings, showEventsWithoutLinks: e.target.checked })}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="showEventsWithoutLinks2" className="ml-2 block text-sm text-gray-700">
                                Events ohne Links anzeigen
                                <InfoTooltip text={fieldDescriptions.showEventsWithoutLinks || ""} />
                            </label>
                        </div>
                        <div className="flex items-center">
                            <input
                                id="iterateIframes2"
                                type="checkbox"
                                checked={settings.iterateIframes}
                                onChange={(e) => onChange({ ...settings, iterateIframes: e.target.checked })}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="iterateIframes2" className="ml-2 block text-sm text-gray-700">
                                Iframes durchsuchen
                                <InfoTooltip text={fieldDescriptions.iterateIframes || ""} />
                            </label>
                        </div>
                        <div className="flex items-center">
                            <input
                                id="expectedEvents2"
                                type="number"
                                value={settings.expectedEvents}
                                onChange={(e) => onChange({ ...settings, expectedEvents: Number(e.target.value) })}
                                className="w-20 px-2 py-1 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                            />
                            <label htmlFor="expectedEvents2" className="ml-2 block text-sm text-gray-700">
                                Erwartete Anzahl Events
                                <InfoTooltip text={fieldDescriptions.expectedEvents || ""} />
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Configuration preview component
    const ConfigPreview = () => (
        <div className="mt-6">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-800 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
                        </svg>
                        Konfigurationsvorschau
                    </h4>
                </div>
                
                <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Textverarbeitung</h5>
                            {queryPreview
                                .filter(item => ['Min Text Length', 'Max Text Length', 'Max Combined Size'].includes(item.label))
                                .map(({ label, value }, idx) => (
                                    <div key={idx} className="bg-gray-50 rounded-lg p-2.5 flex justify-between items-center">
                                        <span className="font-medium text-gray-700">{label}</span>
                                        <span className="text-blue-700 font-mono px-2 py-0.5 bg-blue-50 rounded">{value}</span>
                                    </div>
                                ))
                            }
                        </div>
                        
                        <div className="space-y-3">
                            <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Event-Einstellungen</h5>
                            {queryPreview
                                .filter(item => ['GPT Model', 'Expected Events'].includes(item.label))
                                .map(({ label, value }, idx) => (
                                    <div key={idx} className="bg-gray-50 rounded-lg p-2.5 flex justify-between items-center">
                                        <span className="font-medium text-gray-700">{label}</span>
                                        <span className="text-blue-700 font-mono px-2 py-0.5 bg-blue-50 rounded">{value}</span>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                    
                    {queryPreview.find(item => item.label === 'Category Set') && (
                        <div className="mt-4 space-y-3">
                            <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Kategorien</h5>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <div className="text-sm text-gray-700 whitespace-pre-wrap break-words font-mono">
                                    {queryPreview.find(item => item.label === 'Category Set')?.value}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div className="mt-4 space-y-3">
                        <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Zusätzliche Optionen</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {queryPreview
                                .filter(item => ['Elemente ohne Links', 'Iframe-Inhalt einbeziehen'].includes(item.label))
                                .map(({ label, value }, idx) => (
                                    <div key={idx} className="bg-gray-50 rounded-lg p-2.5 flex justify-between items-center">
                                        <span className="font-medium text-gray-700">{label}</span>
                                        <span className={`text-white font-medium text-xs px-2 py-0.5 rounded ${value === 'Ja' ? 'bg-green-500' : 'bg-gray-400'}`}>
                                            {value}
                                        </span>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                    
                    {queryPreview.find(item => item.label === 'Custom Prompt') && (
                        <div className="mt-4 space-y-3">
                            <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Custom Prompt</h5>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words font-mono">
                                    {queryPreview.find(item => item.label === 'Custom Prompt')?.value}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Diese Vorschau zeigt die aktuellen API-Parameter in einer lesbaren Form.
                    </p>
                </div>
            </div>
        </div>
    );

    // Default Settings tab content
    const DefaultSettingsTab = () => (
        <div className="p-6 space-y-6">
            {/* Conditional rendering based on activeSection */}
            <div style={{ height: 'auto' }}>
                {activeSection === 'basic' && <BasicSettingsContent />}
                {activeSection === 'advanced' && <AdvancedSettingsContent />}
            </div>

            {/* Configuration Preview - always visible */}
            <ConfigPreview />

            {/* Footer buttons */}
            <div className="mt-6 flex justify-end">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2 text-sm font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                    Speichern & Schließen
                </button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-xl p-6 w-full max-w-4xl shadow-lg overflow-y-auto" style={{ height: 'auto', maxHeight: '90vh' }}>
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-800">Erweiterte Einstellungen</h3>
                    <button onClick={onClose} className="text-gray-600 hover:text-gray-900">
                        <X size={24} />
                    </button>
                </div>
                
                {/* Main Tabs */}
                <div className="sticky top-0 bg-white z-10 pb-1 border-b border-gray-200">
                    <nav className="flex relative">
                        <button
                            onClick={() => setActiveTab('default')}
                            className={`py-3 px-6 text-sm font-medium rounded-t-lg ${
                                activeTab === 'default' ? 'bg-white border-t border-l border-r border-gray-200 text-blue-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                            }`}
                        >
                            <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Standardeinstellungen
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('stored')}
                            className={`py-3 px-6 text-sm font-medium rounded-t-lg ${
                                activeTab === 'stored' ? 'bg-white border-t border-l border-r border-gray-200 text-blue-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                            }`}
                        >
                            <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                                Gespeicherte Einstellungen
                            </div>
                        </button>
                    </nav>
                </div>
                
                {/* Sub-tabs for Default Settings tab */}
                {activeTab === 'default' && (
                    <div className="bg-white pt-4 px-4">
                        <div className="flex mb-4 border-b border-gray-200">
                            <button
                                onClick={() => setActiveSection('basic')}
                                className={`mr-4 pb-2 relative ${
                                    activeSection === 'basic' 
                                    ? 'text-blue-600 font-medium' 
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Grundeinstellungen
                                {activeSection === 'basic' && (
                                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveSection('advanced')}
                                className={`mr-4 pb-2 relative ${
                                    activeSection === 'advanced' 
                                    ? 'text-blue-600 font-medium' 
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Erweiterte Einstellungen
                                {activeSection === 'advanced' && (
                                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600"></span>
                                )}
                            </button>
                        </div>
                    </div>
                )}
                
                {/* Main content area */}
                <div style={{ height: 'auto' }}>
                    {activeTab === 'default' ? (
                        <DefaultSettingsTab />
                    ) : (
                        <StoredSettingsTab onRestoreSettings={onChange} />
                    )}
                </div>
            </div>
        </div>
    );
}