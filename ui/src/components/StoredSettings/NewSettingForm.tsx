import { X, Save, Download } from 'lucide-react';
import type { StoredSetting } from './types';
import { DEFAULT_SETTINGS } from '../../config/settings';
import { FormInput, FormCheckbox, FormFieldset } from './FormElements';
import { useState, useEffect } from 'react';

interface NewSettingFormProps {
  setting: StoredSetting;
  onSave: () => void;
  onCancel: () => void;
  onChange: (field: string, value: any) => void;
}

export function NewSettingForm({ setting, onSave, onCancel, onChange }: NewSettingFormProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Debug information - log the state of the prompt when component mounts
  useEffect(() => {
    console.log("NewSettingForm mounted with prompt:", setting.settings.customPrompt);
    console.log("DEFAULT prompt is:", DEFAULT_SETTINGS.customPrompt);
    
    // Set an indicator directly in the UI
    const debugInfo = document.createElement('div');
    debugInfo.style.position = 'fixed';
    debugInfo.style.top = '10px';
    debugInfo.style.right = '10px';
    debugInfo.style.backgroundColor = '#f8d7da';
    debugInfo.style.padding = '5px';
    debugInfo.style.borderRadius = '3px';
    debugInfo.style.zIndex = '9999';
    debugInfo.style.fontSize = '12px';
    debugInfo.textContent = `Prompt set: ${setting.settings.customPrompt ? 'YES' : 'NO'}`;
    document.body.appendChild(debugInfo);
    
    return () => {
      if (document.body.contains(debugInfo)) {
        document.body.removeChild(debugInfo);
      }
    };
  }, []);

  const handleSettingsChange = (field: string, value: any) => {
    // Clear error for this field when changing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[field];
        return newErrors;
      });
    }
    onChange(`settings.${field}`, value);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Required fields validation
    if (!setting.source_url.trim()) {
      newErrors['source_url'] = 'Source URL is required';
    } else if (!/^https?:\/\/.+/.test(setting.source_url)) {
      newErrors['source_url'] = 'Please enter a valid URL (starting with http:// or https://)';
    }

    // Numeric validations
    if (setting.settings.minTextLength <= 0) {
      newErrors['minTextLength'] = 'Must be greater than 0';
    }
    
    if (setting.settings.maxTextLength <= 0) {
      newErrors['maxTextLength'] = 'Must be greater than 0';
    }
    
    if (setting.settings.maxCombinedSize <= 0) {
      newErrors['maxCombinedSize'] = 'Must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave();
    }
  };

  const resetToDefaults = () => {
    // Reset all settings to defaults except source URL
    Object.keys(DEFAULT_SETTINGS).forEach(key => {
      handleSettingsChange(key, DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS]);
    });
  };

  return (
    <div className="border rounded-md mt-6 shadow-md bg-white">
      <div className="flex items-center justify-between bg-gradient-to-r from-green-500 to-green-600 px-4 py-3 text-white rounded-t-md">
        <span className="font-bold">Add New Source Settings</span>
        <button 
          onClick={onCancel} 
          className="text-white hover:bg-green-700 p-1 rounded-full transition-colors"
          aria-label="Cancel"
        >
          <X size={20} />
        </button>
      </div>
      
      {/* Tabs navigation */}
      <div className="flex border-b">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'basic' 
              ? 'border-b-2 border-green-500 text-green-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('basic')}
        >
          Basic Settings
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'advanced' 
              ? 'border-b-2 border-green-500 text-green-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('advanced')}
        >
          Advanced Settings
        </button>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Source URL - Always visible */}
        <div className="mb-4">
          <FormInput
            label="Source URL"
            type="url"
            value={setting.source_url}
            onChange={(value) => onChange('source_url', value)}
            placeholder="https://example.com/events"
            error={errors['source_url']}
          />
        </div>

        {activeTab === 'basic' && (
          <>
            <FormFieldset legend="Basic Configuration">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                <FormInput
                  label="Min Text Length"
                  type="number"
                  value={setting.settings.minTextLength}
                  onChange={(value) => handleSettingsChange('minTextLength', value)}
                  error={errors['minTextLength']}
                />
                <FormInput
                  label="Expected Events"
                  type="number"
                  value={setting.settings.expectedEvents}
                  onChange={(value) => handleSettingsChange('expectedEvents', value)}
                />
                <FormInput
                  label="GPT Model"
                  type="text"
                  value={setting.settings.gptModel}
                  onChange={(value) => handleSettingsChange('gptModel', value)}
                />
              </div>
            </FormFieldset>

            <div className="flex flex-wrap gap-4 mt-4">
              <FormCheckbox
                label="Show Events Without Links"
                checked={setting.settings.showEventsWithoutLinks}
                onChange={(value) => handleSettingsChange('showEventsWithoutLinks', value)}
              />
              <FormCheckbox
                label="Iterate Iframes"
                checked={setting.settings.iterateIframes}
                onChange={(value) => handleSettingsChange('iterateIframes', value)}
              />
            </div>
          </>
        )}

        {activeTab === 'advanced' && (
          <>
            <FormFieldset legend="Text Processing Settings">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                <FormInput
                  label="Min Text Length"
                  type="number"
                  value={setting.settings.minTextLength}
                  onChange={(value) => handleSettingsChange('minTextLength', value)}
                  error={errors['minTextLength']}
                />
                <FormInput
                  label="Max Text Length"
                  type="number"
                  value={setting.settings.maxTextLength}
                  onChange={(value) => handleSettingsChange('maxTextLength', value)}
                  error={errors['maxTextLength']}
                />
                <FormInput
                  label="Max Combined Size"
                  type="number"
                  value={setting.settings.maxCombinedSize}
                  onChange={(value) => handleSettingsChange('maxCombinedSize', value)}
                  error={errors['maxCombinedSize']}
                />
              </div>
            </FormFieldset>

            <FormFieldset legend="Event Extraction Settings">
              <div className="mt-3">
                <FormInput
                  label="Category Set"
                  type="text"
                  value={setting.settings.categorySet}
                  onChange={(value) => handleSettingsChange('categorySet', value)}
                />
              </div>
              <div className="mt-3">
                {/* Hardcoded prompt */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600">Custom Prompt</label>
                  <textarea
                    value={setting.settings.customPrompt || "Please provide a concise summary of the following text. If no events, state \"No events found.\". Do not skip any event. Make sure all of them are taken from the text provided. No markdown. Response in German. DO NOT BE LAZY. THIS IS IMPORTANT."}
                    onChange={(e) => handleSettingsChange('customPrompt', e.target.value)}
                    placeholder="Enter a custom prompt..."
                    rows={8}
                    className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The prompt used for GPT to extract events from the website content.
                  </p>
                </div>
              </div>
            </FormFieldset>
          </>
        )}

        <div className="flex justify-between mt-6 pt-4 border-t">
          <button
            onClick={resetToDefaults}
            className="inline-flex items-center px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 focus:ring-2 focus:ring-gray-300 transition-colors"
          >
            <Download size={16} className="mr-2" />
            Reset to Defaults
          </button>
          
          <div className="space-x-3">
            <button
              onClick={onCancel}
              className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 focus:ring-2 focus:ring-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-400 transition-colors"
            >
              <Save size={16} className="mr-2" />
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}