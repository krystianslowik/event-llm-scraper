export interface Event {
  id: number;
  title: string;
  description: string;
  url: string;
  source_url: string;
  category: string;
  date: string;
  created_at: string;
  updated_at: string;
  title_vector: string;
}

export interface APIResponse {
  data: Event[];
  status: 'cached' | 'fetched';
}

export interface URLStatus {
  url: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
  data?: Event[];
  isCached?: boolean;
}