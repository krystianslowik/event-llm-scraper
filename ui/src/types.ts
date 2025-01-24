export interface Event {
  title: string;
  description: string;
  url: string;
  category: string;
  date: string;
}

export interface EventsResponse {
  events: Event[];
  categories: string[];
}

export interface URLStatus {
  url: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
  data?: EventsResponse;
}