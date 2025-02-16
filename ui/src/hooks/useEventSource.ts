import { useEffect } from 'react';
import { USE_MOCK_DATA } from '../config';
import type { APIResponse } from '../types';

export function useEventSource(url: string, onMessage: (data: APIResponse) => void) {
  useEffect(() => {
    if (USE_MOCK_DATA) {
      return;
    }

    const eventSource = new EventSource(`http://localhost:3000/events/stream?url=${encodeURIComponent(url)}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as APIResponse;
        onMessage(data);
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
    };

    return () => {
      eventSource.close();
    };
  }, [url, onMessage]);
}