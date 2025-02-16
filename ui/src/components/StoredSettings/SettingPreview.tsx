import { Edit2 } from 'lucide-react';
import type { StoredSetting } from './types';

interface SettingPreviewProps {
  setting: StoredSetting;
  onEdit: () => void;
}

export function SettingPreview({ setting, onEdit }: SettingPreviewProps) {
  return (
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
          onClick={onEdit}
          className="inline-flex items-center px-3 py-1 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white transition-colors"
        >
          <Edit2 size={16} className="mr-1" />
          Edit
        </button>
      </div>
    </div>
  );
}