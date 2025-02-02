import React from 'react';
import { Calendar, Link as LinkIcon, Clock } from 'lucide-react';
import { Event } from '../types';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const formattedDate = new Date(event.date).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedTime = new Date(event.date).toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  return (
    <div className="group p-6 bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
          {event.title}
        </h3>
        <span className="px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-full">
          {event.category}
        </span>
      </div>
      <p className="text-gray-600 mb-6 line-clamp-3">{event.description}</p>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center text-gray-500">
          <Calendar size={16} className="mr-2 text-blue-500" />
          {formattedDate}
        </div>
        <div className="flex items-center text-gray-500">
          <Clock size={16} className="mr-2 text-blue-500" />
          {formattedTime}
        </div>
        <a
          href={event.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-blue-600 hover:text-blue-700 ml-auto"
        >
          <LinkIcon size={16} className="mr-2" />
          Ereignis anzeigen
        </a>
      </div>
    </div>
  );
}