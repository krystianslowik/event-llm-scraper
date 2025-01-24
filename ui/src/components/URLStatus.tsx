import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, Link as LinkIcon } from 'lucide-react';
import type { URLStatus as URLStatusType } from '../types';

interface URLStatusProps {
  status: URLStatusType;
}

const loadingMessages = [
  "Scannen der Webseite...",
  "Ereignisse extrahieren...",
  "Verarbeitung von Daten...",
  "Analyse des Inhalts...",
  "Fast am Ziel..."
];

export function URLStatus({ status }: URLStatusProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (status.status === 'loading') {
      const interval = setInterval(() => {
        setMessageIndex((current) => (current + 1) % loadingMessages.length);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [status.status]);

  const getStatusIcon = () => {
    switch (status.status) {
      case 'success':
        return <CheckCircle className="text-emerald-500 shrink-0" size={16} />;
      case 'error':
        return <XCircle className="text-red-500 shrink-0" size={16} />;
      case 'loading':
        return <Loader2 className="text-blue-500 animate-spin shrink-0" size={16} />;
      default:
        return null;
    }
  };

  const getStatusStyles = () => {
    switch (status.status) {
      case 'success':
        return 'bg-emerald-50 border-emerald-100';
      case 'error':
        return 'bg-red-50 border-red-100';
      case 'loading':
        return 'bg-blue-50 border-blue-100';
      default:
        return 'bg-gray-50 border-gray-100';
    }
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${getStatusStyles()}`}>
      {getStatusIcon()}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <LinkIcon size={12} className="text-gray-400 shrink-0" />
          <div className="truncate text-sm font-medium text-gray-700">{status.url}</div>
        </div>
        <div className="mt-0.5 text-xs">
          {status.status === 'loading' && (
            <span className="text-blue-600 font-medium">{loadingMessages[messageIndex]}</span>
          )}
          {status.status === 'error' && (
            <span className="text-red-600 font-medium">{status.error}</span>
          )}
          {status.status === 'success' && (
            <span className="text-emerald-600 font-medium">
              {status.data?.events.length || 0} Ereignisse gefunden
            </span>
          )}
        </div>
      </div>
    </div>
  );
}