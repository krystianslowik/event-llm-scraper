import { X } from 'lucide-react';
import type { StoredSetting } from './types';
import { DEFAULT_SETTINGS } from '../../config/settings';
import { FormInput, FormTextArea, FormCheckbox, FormFieldset } from './FormElements';

interface NewSettingFormProps {
  setting: StoredSetting;
  onSave: () => void;
  onCancel: () => void;
  onChange: (field: string, value: any) => void;
}

export function NewSettingForm({ setting, onSave, onCancel, onChange }: NewSettingFormProps) {
  const handleSettingsChange = (field: string, value: any) => {
    onChange(`settings.${field}`, value);
  };

  return (
    <div className="border rounded-md mt-6 shadow-sm">
      <div className="flex items-center justify-between bg-green-100 px-4 py-3">
        <span className="font-bold text-gray-800">New Setting</span>
        <button onClick={onCancel} className="text-gray-600 hover:text-gray-800">
          <X size={20} />
        </button>
      </div>
      <div className="p-4 space-y-4">
        <FormInput
          label="Source URL"
          type="url"
          value={setting.source_url}
          onChange={(value) => onChange('source_url', value)}
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

        <div className="flex items-center space-x-4">
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

        <div className="flex justify-end space-x-4 mt-4">
          <button
            onClick={onSave}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:ring-2 focus:ring-green-400 transition-colors"
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:ring-2 focus:ring-red-400 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}