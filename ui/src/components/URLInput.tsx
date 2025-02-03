// URLInput.tsx
import React, { useState } from 'react';
import { Link as LinkIcon, FileText, Sliders } from 'lucide-react';
import type { AdvancedSettings } from '../App';
import { AdvancedSettingsModal } from './AdvancedSettingsModal';

interface URLInputProps {
  onSubmit: (urls: string[], advancedSettings: AdvancedSettings) => void;
  isLoading: boolean;
}

export function URLInput({ onSubmit, isLoading }: URLInputProps) {
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [singleUrl, setSingleUrl] = useState('');
  const [batchUrls, setBatchUrls] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>({
    minTextLength: 25,
    maxTextLength: 4000,
    maxCombinedSize: 4000,
    categorySet:
        "Familienleben, Aktivitäten, Veranstaltungen, Essen/Rezepte, Münsterland, Kultur/Lifestyle, Gesundheit, Reisen, Einkaufen, Gemeinschaft, Tipps & Ratgeber",
    customPrompt: '',
    gptModel: 'gpt-4o-mini',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let urls: string[] = [];
    if (isBatchMode) {
      urls = batchUrls
          .split('\n')
          .map((url) => url.trim())
          .filter((url) => url !== '');
    } else {
      if (singleUrl.trim()) urls = [singleUrl.trim()];
    }
    if (urls.length > 0) {
      onSubmit(urls, advancedSettings);
      if (isBatchMode) {
        setBatchUrls('');
      } else {
        setSingleUrl('');
      }
    }
  };

  return (
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-medium text-gray-700 flex items-center gap-2">
            <LinkIcon size={18} className="text-blue-600" />
            URL-Sammlung
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Modus:</span>
            <div className="flex p-1 bg-gray-100 rounded-lg">
              <button
                  type="button"
                  onClick={() => setIsBatchMode(false)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-md transition-all ${
                      !isBatchMode
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                <LinkIcon size={16} />
                <span>Einzeln</span>
              </button>
              <button
                  type="button"
                  onClick={() => setIsBatchMode(true)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-md transition-all ${
                      isBatchMode
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                <FileText size={16} />
                <span>Stapel</span>
              </button>
            </div>
            <button
                type="button"
                onClick={() => setShowAdvanced(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              <Sliders size={16} />
              <span>Erweiterte Einstellungen</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isBatchMode ? (
              <div className="space-y-4">
            <textarea
                value={batchUrls}
                onChange={(e) => setBatchUrls(e.target.value)}
                placeholder="Mehrere URLs eingeben (eine pro Zeile)"
                className="w-full h-32 px-4 py-3 text-sm bg-gray-50 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 transition-all resize-none"
            />
                <div className="flex justify-end">
                  <button
                      type="submit"
                      disabled={isLoading || !batchUrls.trim()}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? 'Verarbeitung...' : 'Prozess-URLs'}
                  </button>
                </div>
              </div>
          ) : (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <LinkIcon size={16} className="text-gray-400" />
                  </div>
                  <input
                      type="url"
                      value={singleUrl}
                      onChange={(e) => setSingleUrl(e.target.value)}
                      placeholder="https://example.com/events"
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 border-0 rounded-lg focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400 transition-all"
                      required
                  />
                </div>
                <button
                    type="submit"
                    disabled={isLoading || !singleUrl.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                >
                  {isLoading ? 'Verarbeitung...' : 'Auszug Ereignisse'}
                </button>
              </div>
          )}
        </form>

        {showAdvanced && (
            <AdvancedSettingsModal
                settings={advancedSettings}
                onChange={setAdvancedSettings}
                onClose={() => setShowAdvanced(false)}
            />
        )}
      </div>
  );
}