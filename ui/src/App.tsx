import { useState, useMemo } from 'react';
import { Calendar, Sparkles, SearchX, RefreshCw, Tag } from 'lucide-react';
import { URLInput } from './components/URLInput';
import { EventCard } from './components/EventCard';
import { EventsTable } from './components/EventsTable';
import { Filters } from './components/Filters';
import { URLStatus as URLStatusComponent } from './components/URLStatus';
import { ViewSwitch } from './components/ViewSwitch';
import type { Event, URLStatus } from './types';

type SortConfig = {
  key: keyof Event;
  direction: 'asc' | 'desc';
} | null;

export default function App() {
  const [urlStatuses, setUrlStatuses] = useState<URLStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  const isLoading = urlStatuses.some((status) => status.status === 'loading');

  const allEvents = useMemo(() => {
    return urlStatuses
      .filter((status) => status.status === 'success' && status.data)
      .flatMap((status) => status.data!.events);
  }, [urlStatuses]);

  const allCategories = useMemo(() => {
    return Array.from(
      new Set(
        urlStatuses
          .filter((status) => status.status === 'success' && status.data)
          .flatMap((status) => status.data!.categories)
      )
    );
  }, [urlStatuses]);

  const filteredEvents = useMemo(() => {
    let events = allEvents.filter((event) => {
      const matchesSearch = searchTerm === '' || 
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === '' || 
        event.category === selectedCategory;

      return matchesSearch && matchesCategory;
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
  }, [allEvents, searchTerm, selectedCategory, sortConfig]);

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

  const handleSubmit = async (urls: string[]) => {
    // Clear previous scrapes
    setUrlStatuses([]);
    setSearchTerm('');
    setSelectedCategory('');
    
    const newStatuses = urls.map((url) => ({
      url,
      status: 'loading' as const,
    }));

    setUrlStatuses(newStatuses);

    urls.forEach(async (url, _index) => {
      try {
        const encodedUrl = encodeURIComponent(url);
        const response = await fetch(`http://localhost:3000/events?url=${encodedUrl}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }

        const data = await response.json();

        setUrlStatuses((prev) => {
          const newStatuses = [...prev];
          const statusIndex = prev.findIndex(status => status.url === url);
          if (statusIndex !== -1) {
            newStatuses[statusIndex] = {
              url,
              status: 'success',
              data,
            };
          }
          return newStatuses;
        });
      } catch (error) {
        setUrlStatuses((prev) => {
          const newStatuses = [...prev];
          const statusIndex = prev.findIndex(status => status.url === url);
          if (statusIndex !== -1) {
            newStatuses[statusIndex] = {
              url,
              status: 'error',
              error: error instanceof Error ? error.message : 'Es ist ein Fehler aufgetreten',
            };
          }
          return newStatuses;
        });
      }
    });
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Jaraco Events
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mb-6">
            Extrahieren und Organisieren von Ereignissen aus jeder Webseite mit nur wenigen Klicks
          </p>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <Sparkles size={16} className="text-blue-500" />
            <span>Mehrere URLs</span>
            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
            <span>Stapelverarbeitung</span>
            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
            <span>Intelligente Kategorisierung</span>
          </div>
        </div>

        <div className="space-y-8">
          <URLInput onSubmit={handleSubmit} isLoading={isLoading} />

          {urlStatuses.length > 0 && (
            <div className="space-y-8">
              <div className="bg-white p-6 rounded-xl shadow-sm">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
                  Bearbeitungsstatus
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {urlStatuses.map((status, index) => (
                    <URLStatusComponent key={index} status={status} />
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
                    <div className="flex justify-end mb-4">
                      <ViewSwitch view={viewMode} onChange={setViewMode} />
                    </div>
                    {filteredEvents.length > 0 ? (
                      <div className="transition-all duration-300">
                        {viewMode === 'grid' ? (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {filteredEvents.map((event, index) => (
                              <EventCard key={index} event={event} />
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-xl overflow-hidden">
                            <EventsTable
                              events={filteredEvents}
                              sortConfig={sortConfig}
                              onSort={handleSort}
                            />
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
                            ? `Keine passenden Veranstaltungen gefunden "${searchTerm}"`
                            : selectedCategory
                            ? `Keine Veranstaltungen in der Kategorie gefunden "${selectedCategory}"`
                            : "Keine Veranstaltungen gefunden"}
                        </h3>
                        <p className="text-gray-500 mb-6 max-w-md">
                          {searchTerm || selectedCategory ? (
                            <>
                              Try adjusting your search criteria or browse all events
                              {allEvents.length > 0 && ` (${allEvents.length} total)`}
                            </>
                          ) : (
                            "Es wurden keine Ereignisse unter den angegebenen URLs gefunden"
                          )}
                        </p>
                        {(searchTerm || selectedCategory) && (
                          <div className="flex gap-3">
                            <button
                              onClick={handleClearFilters}
                              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                            >
                              <RefreshCw size={16} />
                              Filter löschen
                            </button>
                            {selectedCategory && (
                              <button
                                onClick={() => setSelectedCategory('')}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                              >
                                <Tag size={16} />
                                Alle Kategorien anzeigen
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {allEvents.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl">
                  <p className="text-gray-500 text-lg">Es wurden noch keine Ereignisse gefunden</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}