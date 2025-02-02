// src/App.tsx

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Calendar, Sparkles, SearchX, RefreshCw, Tag } from 'lucide-react';
import { URLInput } from './components/URLInput';
import { EventCard } from './components/EventCard';
import { EventsTable } from './components/EventsTable';
import { Filters } from './components/Filters';
import { URLStatus as URLStatusComponent } from './components/URLStatus';
import { ViewSwitch } from './components/ViewSwitch';
import { ExportCSVButton } from './components/ExportCSVButton';
import type { Event, URLStatus, APIResponse } from './types';

type SortConfig = {
  key: keyof Event;
  direction: 'asc' | 'desc';
} | null;

type EventSourceMap = {
  [url: string]: EventSource;
};

export default function App() {
  const [urlStatuses, setUrlStatuses] = useState<URLStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  // Changed from single source to multiple sources (array)
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const eventSourcesRef = useRef<EventSourceMap>({});

  const isLoading = urlStatuses.some((status) => status.status === 'loading');

  // Cleanup function for EventSource connections
  const cleanupEventSource = (url: string) => {
    if (eventSourcesRef.current[url]) {
      eventSourcesRef.current[url].close();
      delete eventSourcesRef.current[url];
    }
  };

  // Cleanup all EventSource connections on component unmount
  useEffect(() => {
    return () => {
      Object.keys(eventSourcesRef.current).forEach(cleanupEventSource);
    };
  }, []);

  const allEvents = useMemo(() => {
    return urlStatuses
        .filter((status) => status.status === 'success' && status.data)
        .flatMap((status) =>
            status.data!.map((event) => ({
              ...event,
              source_url: status.url,
            }))
        );
  }, [urlStatuses]);

  const allCategories = useMemo(() => {
    return Array.from(new Set(allEvents.map((event) => event.category)));
  }, [allEvents]);

  const filteredEvents = useMemo(() => {
    let events = allEvents.filter((event) => {
      const matchesSearch =
          searchTerm === '' ||
          event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          event.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
          selectedCategory === '' || event.category === selectedCategory;

      // If no sources are selected, include all events; otherwise filter by selected sources.
      const matchesSource =
          selectedSources.length === 0 || selectedSources.includes(event.source_url);

      return matchesSearch && matchesCategory && matchesSource;
    });

    if (sortConfig) {
      events = [...events].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return events;
  }, [allEvents, searchTerm, selectedCategory, selectedSources, sortConfig]);

  const handleSort = (key: keyof Event) => {
    setSortConfig((current) => {
      if (current?.key === key) {
        return {
          key,
          direction: current.direction === 'asc' ? 'desc' : 'asc',
        };
      }
      return { key, direction: 'asc' };
    });
  };

  const setupEventSource = (url: string) => {
    cleanupEventSource(url);

    const encodedUrl = encodeURIComponent(url);
    const eventSource = new EventSource(`http://localhost:3000/events-stream?url=${encodedUrl}`);

    eventSource.onmessage = (event) => {
      try {
        const updatedData = JSON.parse(event.data) as APIResponse;
        if (updatedData.data) {
          setUrlStatuses((prev) => {
            const newStatuses = [...prev];
            const statusIndex = prev.findIndex((status) => status.url === url);
            if (statusIndex !== -1) {
              const eventsWithSource = updatedData.data.map((event) => ({
                ...event,
                source_url: url,
              }));
              newStatuses[statusIndex] = {
                url,
                status: 'success',
                data: eventsWithSource,
                isCached: updatedData.status === 'cached',
              };
            }
            return newStatuses;
          });
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      setUrlStatuses((prev) =>
          prev.map((statusObj) =>
              statusObj.url === url
                  ? { ...statusObj, status: 'error', error: 'SSE connection error' }
                  : statusObj
          )
      );
      cleanupEventSource(url);
    };

    eventSourcesRef.current[url] = eventSource;
  };

  const handleSubmit = async (urls: string[]) => {
    Object.keys(eventSourcesRef.current).forEach(cleanupEventSource);
    setUrlStatuses([]);
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedSources([]);

    const newStatuses = urls.map((url) => ({
      url,
      status: 'loading' as const,
    }));

    setUrlStatuses(newStatuses);

    for (const url of urls) {
      try {
        const encodedUrl = encodeURIComponent(url);
        const response = await fetch(`http://localhost:3000/events?url=${encodedUrl}`);

        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }

        const { data, status } = (await response.json()) as APIResponse;

        setUrlStatuses((prev) => {
          const newStatuses = [...prev];
          const statusIndex = prev.findIndex((statusObj) => statusObj.url === url);
          if (statusIndex !== -1) {
            const eventsWithSource = data.map((event) => ({
              ...event,
              source_url: url,
            }));
            newStatuses[statusIndex] = {
              url,
              status: 'success',
              data: eventsWithSource,
              isCached: status === 'cached',
            };
          }
          return newStatuses;
        });

        if (status === 'cached') {
          setupEventSource(url);
        }
      } catch (error) {
        setUrlStatuses((prev) => {
          const newStatuses = [...prev];
          const statusIndex = prev.findIndex((statusObj) => statusObj.url === url);
          if (statusIndex !== -1) {
            newStatuses[statusIndex] = {
              url,
              status: 'error',
              error: error instanceof Error ? error.message : 'An error occurred',
            };
          }
          return newStatuses;
        });
      }
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedSources([]);
  };

  const toggleSourceFilter = (url: string) => {
    setSelectedSources((current) => {
      if (current.includes(url)) {
        return current.filter((item) => item !== url);
      } else {
        return [...current, url];
      }
    });
  };

  const getEventsCountForUrl = (url: string) => {
    const status = urlStatuses.find((s) => s.url === url);
    return status?.status === 'success' && status.data ? status.data.length > 0 : false;
  };

  return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex flex-col items-center text-center mb-12">
            <div className="mb-6">
              <div className="bg-blue-600 p-4 rounded-xl shadow-md">
                <Calendar size={32} className="text-white" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Event Scraper</h1>
            <p className="text-lg text-gray-600 max-w-2xl mb-6">
              Extract and organize events from any webpage with just a few clicks
            </p>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <Sparkles size={16} className="text-blue-500" />
              <span>Multiple URLs</span>
              <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
              <span>Batch processing</span>
              <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
              <span>Smart categorization</span>
            </div>
          </div>

          <div className="space-y-8">
            <URLInput onSubmit={handleSubmit} isLoading={isLoading} />

            {urlStatuses.length > 0 && (
                <div className="space-y-8">
                  <div className="bg-white p-6 rounded-xl shadow-sm">
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
                      Processing Status
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {urlStatuses.map((status, index) => (
                          <URLStatusComponent
                              key={index}
                              status={status}
                              isActive={selectedSources.includes(status.url)}
                              onToggle={() => toggleSourceFilter(status.url)}
                              hasEvents={getEventsCountForUrl(status.url)}
                          />
                      ))}
                    </div>
                  </div>

                  {allEvents.length > 0 && (
                      <div className="space-y-6">
                        <div className="flex flex-col lg:flex-row gap-4 justify-between">
                          <Filters
                              categories={allCategories}
                              selectedCategory={selectedCategory}
                              searchTerm={searchTerm}
                              onCategoryChange={setSelectedCategory}
                              onSearchChange={setSearchTerm}
                          />
                        </div>

                        <div className="bg-white p-4 rounded-xl shadow-sm">
                          <div className="flex justify-between items-center mb-4">
                            <div className="text-sm text-gray-500">
                              {selectedSources.length > 0 && (
                                  <button
                                      onClick={() => setSelectedSources([])}
                                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                  >
                                    <Tag size={14} />
                                    Clear source filter
                                  </button>
                              )}
                            </div>
                            <ViewSwitch view={viewMode} onChange={setViewMode} />
                          </div>
                          {filteredEvents.length > 0 ? (
                              <div className="transition-all duration-300">
                                {viewMode === 'grid' ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                      {filteredEvents.map((event) => (
                                          <EventCard key={event.id} event={event} />
                                      ))}
                                    </div>
                                ) : (
                                    <div className="rounded-xl overflow-hidden">
                                      <EventsTable events={filteredEvents} sortConfig={sortConfig} onSort={handleSort} />
                                    </div>
                                )}
                              </div>
                          ) : (
                              <div className="py-16 flex flex-col items-center justify-center text-center">
                                <div className="bg-gray-50 p-3 rounded-full mb-4">
                                  <SearchX size={32} className="text-gray-400" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                  {searchTerm
                                      ? `No events found matching "${searchTerm}"`
                                      : selectedCategory
                                          ? `No events found in category "${selectedCategory}"`
                                          : selectedSources.length > 0
                                              ? "No events found from the selected sources"
                                              : "No events found"}
                                </h3>
                                <p className="text-gray-500 mb-6 max-w-md">
                                  {searchTerm || selectedCategory || selectedSources.length > 0 ? (
                                      <>
                                        Try adjusting your search criteria or browse all events
                                        {allEvents.length > 0 && ` (${allEvents.length} total)`}
                                      </>
                                  ) : (
                                      "No events have been found from the provided URLs"
                                  )}
                                </p>
                                {(searchTerm || selectedCategory || selectedSources.length > 0) && (
                                    <div className="flex gap-3">
                                      <button
                                          onClick={handleClearFilters}
                                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                      >
                                        <RefreshCw size={16} />
                                        Clear Filters
                                      </button>
                                      {selectedCategory && (
                                          <button
                                              onClick={() => setSelectedCategory('')}
                                              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                          >
                                            <Tag size={16} />
                                            Show All Categories
                                          </button>
                                      )}
                                    </div>
                                )}
                              </div>
                          )}
                        </div>

                        {/* Export CSV Button */}
                        <div className="flex justify-end">
                          <ExportCSVButton data={filteredEvents} />
                        </div>
                      </div>
                  )}

                  {allEvents.length === 0 && (
                      <div className="text-center py-12 bg-white rounded-xl">
                        <p className="text-gray-500 text-lg">No events have been found yet</p>
                      </div>
                  )}
                </div>
            )}
          </div>
        </div>
      </div>
  );
}