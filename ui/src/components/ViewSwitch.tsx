import React from 'react';
import { LayoutGrid, Table as TableIcon } from 'lucide-react';

interface ViewSwitchProps {
  view: 'grid' | 'table';
  onChange: (view: 'grid' | 'table') => void;
}

export function ViewSwitch({ view, onChange }: ViewSwitchProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-600">View:</span>
      <div className="flex p-1 bg-gray-100 rounded-lg">
        <button
          onClick={() => onChange('grid')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-md transition-all ${
            view === 'grid'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          title="Grid view"
        >
          <LayoutGrid size={16} />
          <span>Raster</span>
        </button>
        <button
          onClick={() => onChange('table')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium rounded-md transition-all ${
            view === 'table'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
          title="Table view"
        >
          <TableIcon size={16} />
          <span>Tabelle</span>
        </button>
      </div>
    </div>
  );
}