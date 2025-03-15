import { X, Save, RefreshCw, Download, Trash2 } from 'lucide-react';
import type { StoredSetting } from './types';
import { DEFAULT_SETTINGS } from '../../config/settings';
import { FormInput, FormTextArea, FormCheckbox, FormFieldset } from './FormElements';
import { useState } from 'react';

interface SettingFormProps {
  setting: StoredSetting;
  onCancel: () => void;
  onSave: (setting: StoredSetting) => void;
  onDelete: (setting: StoredSetting) => void;
  onChange: (id: number, field: string, value: any) => void;
}

export function SettingForm({ setting, onCancel, onSave, onDelete, onChange }: SettingFormProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSettingsChange = (field: string, value: any) => {
    // Clear error for this field when changing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[field];
        return newErrors;
      });
    }
    onChange(setting.id, field, value);
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
      // Create a copy to ensure customPrompt is set
      const settingToSave = {
        ...setting,
        settings: {
          ...setting.settings,
          // If customPrompt is somehow empty, use the default
          customPrompt: setting.settings.customPrompt || DEFAULT_SETTINGS.customPrompt
        }
      };
      console.log("Saving edited setting with prompt:", settingToSave.settings.customPrompt);
      onSave(settingToSave);
    }
  };

  const resetToDefaults = () => {
    // Reset all settings to defaults except source URL
    Object.keys(DEFAULT_SETTINGS).forEach(key => {
      handleSettingsChange(key, DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS]);
    });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Tabs navigation */}
      <div className="flex border-b mb-4">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'basic' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('basic')}
        >
          Basic Settings
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'advanced' 
              ? 'border-b-2 border-blue-500 text-blue-600' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('advanced')}
        >
          Advanced Settings
        </button>
      </div>
      
      {/* Source URL - Always visible */}
      <div className="mb-4">
        <FormInput
          label="Source URL"
          type="url"
          value={setting.source_url}
          onChange={(value) => handleSettingsChange('source_url', value)}
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
              {/* Force the default prompt to appear in the textarea */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Custom Prompt</label>
                <textarea
                  value={setting.settings.customPrompt || DEFAULT_SETTINGS.customPrompt}
                  onChange={(e) => handleSettingsChange('customPrompt', e.target.value)}
                  placeholder="Enter a custom prompt..."
                  rows={8}
                  className="w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm font-mono"
                />
                <p className="text-xs text-blue-600 mt-1">
                  {!setting.settings.customPrompt ? '⚠️ Using default prompt - if field appears empty, please reload the page' : ''}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  The prompt used for GPT to extract events from the website content.
                </p>
              </div>
            </div>
          </FormFieldset>
        </>
      )}

      <div className="flex justify-between mt-6 pt-4 border-t">
        <div className="flex space-x-2">
          <button
            onClick={resetToDefaults}
            className="inline-flex items-center px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 focus:ring-2 focus:ring-gray-300 transition-colors"
          >
            <Download size={16} className="mr-2" />
            Reset to Defaults
          </button>
          <button
            onClick={() => onDelete(setting)}
            className="inline-flex items-center px-3 py-2 text-sm border border-red-300 text-red-600 rounded-md hover:bg-red-50 focus:ring-2 focus:ring-red-300 transition-colors"
          >
            <Trash2 size={16} className="mr-2" />
            Delete
          </button>
        </div>
        
        <div className="space-x-3">
          <button
            onClick={onCancel}
            className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 focus:ring-2 focus:ring-gray-300 transition-colors"
          >
            <X size={16} className="mr-1 inline" />
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 transition-colors"
          >
            <Save size={16} className="mr-2" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}