import { X, RefreshCw } from 'lucide-react';
import type { StoredSetting } from './types';
import { DEFAULT_SETTINGS } from '../../config/settings';
import { FormInput, FormTextArea, FormCheckbox, FormFieldset } from './FormElements';

interface SettingFormProps {
  setting: StoredSetting;
  onCancel: () => void;
  onSave: (setting: StoredSetting) => void;
  onDelete: (setting: StoredSetting) => void;
  onChange: (id: number, field: string, value: any) => void;
}

export function SettingForm({ setting, onCancel, onSave, onDelete, onChange }: SettingFormProps) {
  const handleSettingsChange = (field: string, value: any) => {
    onChange(setting.id, field, value);
  };

  return (
    <div className="p-4 space-y-4">
      <FormInput
        label="Source URL"
        type="url"
        value={setting.source_url}
        onChange={(value) => handleSettingsChange('source_url', value)}
        placeholder="https://example.com/events"
      />
      
      <FormFieldset legend="Text Settings">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          <FormInput
            label="Min Text Length"
            type="number"
            value={setting.settings.minTextLength}
            onChange={(value) => handleSettingsChange('minTextLength', value)}
          />
          <FormInput
            label="Max Text Length"
            type="number"
            value={setting.settings.maxTextLength}
            onChange={(value) => handleSettingsChange('maxTextLength', value)}
          />
          <FormInput
            label="Max Combined Size"
            type="number"
            value={setting.settings.maxCombinedSize}
            onChange={(value) => handleSettingsChange('maxCombinedSize', value)}
          />
        </div>
      </FormFieldset>

      <FormFieldset legend="Event & Model Settings">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <FormInput
            label="Category Set"
            type="text"
            value={setting.settings.categorySet}
            onChange={(value) => handleSettingsChange('categorySet', value)}
          />
          <FormInput
            label="GPT Model"
            type="text"
            value={setting.settings.gptModel}
            onChange={(value) => handleSettingsChange('gptModel', value)}
          />
          <FormInput
            label="Expected Events"
            type="number"
            value={setting.settings.expectedEvents}
            onChange={(value) => handleSettingsChange('expectedEvents', value)}
          />
        </div>
        <div className="mt-3">
          <FormTextArea
            label="Custom Prompt"
            value={setting.settings.customPrompt ?? DEFAULT_SETTINGS.customPrompt}
            onChange={(value) => handleSettingsChange('customPrompt', value)}
            placeholder={DEFAULT_SETTINGS.customPrompt}
            className="font-mono"
          />
        </div>
      </FormFieldset>

      <div className="flex flex-col sm:flex-row items-center justify-between mt-4 space-y-3 sm:space-y-0">
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

      <div className="mt-4 flex justify-between items-center">
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="inline-flex items-center px-3 py-1 border border-gray-400 text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
          >
            <X size={16} className="mr-1" />
            Cancel
          </button>
          <button
            onClick={() => onSave(setting)}
            className="inline-flex items-center px-3 py-1 border border-green-600 text-green-600 rounded-md hover:bg-green-600 hover:text-white transition-colors"
          >
            <RefreshCw size={16} className="mr-1" />
            Save
          </button>
        </div>
        <button
          onClick={() => onDelete(setting)}
          className="inline-flex items-center px-3 py-1 border border-red-600 text-red-600 rounded-md hover:bg-red-600 hover:text-white transition-colors"
        >
          <X size={16} className="mr-1" />
          Delete
        </button>
      </div>
    </div>
  );
}