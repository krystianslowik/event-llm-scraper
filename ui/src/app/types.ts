export interface ScraperState {
  urls: string[];
  results: Event[];
  categories: string[];
  loading: boolean;
  selectedCategories: string[];
  selectedSources: string[];
  error: string | null;
}

export interface Event {
  title: string;
  description: string;
  url: string;
  category: string;
  date: string;
  needsUrlCheck?: boolean;
}

export interface ApiResponse {
  events: {
    events: Event[];
    categories: string[];
  };
}