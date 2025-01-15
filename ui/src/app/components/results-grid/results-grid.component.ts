import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Event } from '../../types';

@Component({
  selector: 'app-results-grid',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
      <div *ngFor="let event of results" 
           class="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 hover:shadow-md transition-shadow duration-200">
        <div class="p-6 flex flex-col h-full">
          <h3 class="text-lg font-semibold mb-2 text-gray-900">{{ event.title }}</h3>
          <p class="text-gray-600 mb-4 flex-grow">{{ event.description }}</p>
          <div class="space-y-2 text-sm">
            <p class="text-gray-500">
              <strong>Date:</strong> 
              <span [class.text-amber-600]="!isValidDate(event.date)">
                {{ event.date }}
                <span *ngIf="!isValidDate(event.date)" class="text-xs"> (needs verification)</span>
              </span>
            </p>
            <p class="text-gray-500">
              <strong>Categories:</strong> {{ event.category }}
            </p>
            <div class="flex items-center gap-2 mt-4">
              <a
                [href]="event.url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
              >
                View Event
                <span *ngIf="!isValidUrl(event.url)" class="text-amber-500 text-xs">
                  ⚠️
                </span>
              </a>
              <span *ngIf="!isValidUrl(event.url)" class="text-amber-500 text-xs">
                (needs verification)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ResultsGridComponent {
  @Input() results: Event[] = [];

  isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return false;
      }
      const domain = parsed.hostname;
      if (!domain.includes('.') || domain.includes('events-detail-stadt')) {
        return false;
      }
      const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
      return domainRegex.test(domain);
    } catch {
      return false;
    }
  }

  isValidDate(dateStr: string): boolean {
    const germanDateRegex = /^\d{1,2}\.\d{1,2}\.\d{4}(,\s*\d{1,2}:\d{2}(\s*-\s*\d{1,2}:\d{2})?)?$/;
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/;
    
    return germanDateRegex.test(dateStr) || isoDateRegex.test(dateStr);
  }
}