import React from 'react';
import { ArrowUpDown, Calendar, Link as LinkIcon, Clock } from 'lucide-react';
import { Event } from '../types';

interface EventsTableProps {
  events: Event[];
  sortConfig: {
    key: keyof Event;
    direction: 'asc' | 'desc';
  } | null;
  onSort: (key: keyof Event) => void;
}

export function EventsTable({ events, sortConfig, onSort }: EventsTableProps) {
  const getSortIcon = (key: keyof Event) => {
    if (sortConfig?.key === key) {
      return (
        <ArrowUpDown
          size={16}
          className={`transition-transform ${
            sortConfig.direction === 'desc' ? 'rotate-180' : ''
          }`}
        />
      );
    }
    return <ArrowUpDown size={16} className="text-gray-300" />;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-100">
            <th
              className="px-6 py-4 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => onSort('title')}
            >
              <div className="flex items-center gap-2">
                Titel {getSortIcon('title')}
              </div>
            </th>
            <th
              className="px-6 py-4 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => onSort('date')}
            >
              <div className="flex items-center gap-2">
                Datum und Uhrzeit {getSortIcon('date')}
              </div>
            </th>
            <th
              className="px-6 py-4 text-left text-sm font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => onSort('category')}
            >
              <div className="flex items-center gap-2">
                Kategorie {getSortIcon('category')}
              </div>
            </th>
            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
              Aktionen
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {events.map((event, index) => {
            const date = new Date(event.date);
            const formattedDate = date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });
            const formattedTime = date.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <tr
                key={index}
                className="group hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4">
                  <div className="max-w-md">
                    <div className="font-medium text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                      {event.title}
                    </div>
                    <div className="text-sm text-gray-500 line-clamp-2">
                      {event.description}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar size={14} className="mr-2 text-blue-500" />
                      {formattedDate}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock size={14} className="mr-2 text-blue-500" />
                      {formattedTime}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex px-2.5 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg">
                    {event.category}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <LinkIcon size={14} className="mr-2" />
                    Siehe
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}