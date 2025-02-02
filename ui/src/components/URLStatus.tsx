import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, Link as LinkIcon, RefreshCw } from 'lucide-react';
import type { URLStatus as URLStatusType } from '../types';

interface URLStatusProps {
  status: URLStatusType;
  isActive: boolean;
  onToggle?: () => void;
  hasEvents: boolean;
}

const loadingMessages = [
  "Scanning webpage...",
  "Extracting events...",
  "Processing data...",
  "Analyzing content...",
  "Almost there..."
];

export function URLStatus({ status, isActive, onToggle, hasEvents }: URLStatusProps) {
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
        return status.isCached ? (
            <div className="flex gap-2">
              <RefreshCw className="text-blue-500 animate-spin shrink-0" size={16} />
            </div>
        ) : (
            <CheckCircle className="text-emerald-500 shrink-0" size={16} />
        );
      case 'error':
        return <XCircle className="text-red-500 shrink-0" size={16} />;
      case 'loading':
        return <Loader2 className="text-blue-500 animate-spin shrink-0" size={16} />;
      default:
        return null;
    }
  };

  const getStatusStyles = () => {
    const baseStyles =
        "flex items-center gap-3 p-3 rounded-lg border transition-all duration-200";
    const interactiveStyles = hasEvents ? "cursor-pointer hover:border-blue-400" : "";
    // Add a ring for a visual cue if this source is selected.
    const activeStyles = isActive ? "ring-2 ring-blue-500" : "";

    if (status.status === 'success') {
      return status.isCached
          ? `${baseStyles} ${interactiveStyles} ${activeStyles} bg-yellow-50 border-yellow-100`
          : `${baseStyles} ${interactiveStyles} ${activeStyles} bg-emerald-50 border-emerald-100`;
    }
    if (status.status === 'error') {
      return `${baseStyles} ${activeStyles} bg-red-50 border-red-100`;
    }
    if (status.status === 'loading') {
      return `${baseStyles} ${activeStyles} bg-blue-50 border-blue-100`;
    }
    return `${baseStyles} ${activeStyles} bg-gray-50 border-gray-100`;
  };

  const handleClick = () => {
    if (hasEvents && onToggle) {
      onToggle();
    }
  };

  return (
      <div
          className={getStatusStyles()}
          onClick={handleClick}
          role={hasEvents ? "button" : "status"}
          tabIndex={hasEvents ? 0 : undefined}
      >
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
                <div className="flex items-center gap-2">
              <span className="text-emerald-600 font-medium">
                {status.data?.length || 0} events
              </span>
                  {status.isCached && (
                      <span className="text-blue-600 font-medium">(updating...)</span>
                  )}
                </div>
            )}
          </div>
        </div>
      </div>
  );
}