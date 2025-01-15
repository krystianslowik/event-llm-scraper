import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { config } from '../config';
import { ApiResponse, Event } from '../types';

@Injectable({
  providedIn: 'root'
})
export class ScraperService {
  constructor(private http: HttpClient) {}

  scrapeUrl(url: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(`${config.apiUrl}?url=${encodeURIComponent(url)}`).pipe(
        map(response => this.processResponse(response)),
        catchError(this.handleError)
    );
  }
  private processResponse(response: ApiResponse): ApiResponse {
    // Process and validate the response data
    const events = response.events.events.map(event => ({
      ...event,
      needsUrlCheck: !this.isValidUrl(event.url) || !this.isValidDate(event.date)
    }));

    return {
      events: {
        ...response.events,
        events
      }
    };
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return false;
      }
      const domain = parsed.hostname;
      if (!domain.includes('.')) {
        return false;
      }
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
      return domainRegex.test(domain);
    } catch {
      return false;
    }
  }

  private isValidDate(dateStr: string): boolean {
    const germanDateRegex = /^\d{1,2}\.\d{1,2}\.\d{4}(,\s*\d{1,2}:\d{2}(\s*-\s*\d{1,2}:\d{2})?)?$/;
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/;
    
    return germanDateRegex.test(dateStr) || isoDateRegex.test(dateStr);
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An error occurred while scraping the URL.';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      switch (error.status) {
        case 400:
          errorMessage = 'Invalid URL or request format.';
          break;
        case 404:
          errorMessage = 'The requested resource was not found.';
          break;
        case 429:
          errorMessage = 'Too many requests. Please try again later.';
          break;
        case 500:
          errorMessage = 'Server error. Please try again later.';
          break;
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}