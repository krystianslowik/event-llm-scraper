import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { UrlInputComponent } from './app/components/url-input/url-input.component';
import { FiltersComponent } from './app/components/filters/filters.component';
import { ResultsGridComponent } from './app/components/results-grid/results-grid.component';
import { ScraperService } from './app/services/scraper.service';
import { ScraperState, Event } from './app/types';
import { merge, Subject } from 'rxjs';
import { catchError, map, scan } from 'rxjs/operators';

type TabId = 'scraper' | 'history' | 'settings';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    UrlInputComponent,
    FiltersComponent,
    ResultsGridComponent
  ],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <!-- Navigation -->
      <nav class="bg-white/80 backdrop-blur-lg border-b sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex justify-between h-16">
            <div class="flex items-center">
              <div class="flex-shrink-0 flex items-center">
                <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Jaraco LLM Scraper
                </h1>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <!-- Tabs -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex space-x-8">
            <button
              *ngFor="let tab of tabs"
              (click)="setActiveTab(tab.id)"
              [class]="'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors duration-200 ' +
                (activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300')"
            >
              <span class="material-symbols-outlined text-lg">{{ tab.icon }}</span>
              {{ tab.label }}
            </button>
          </nav>
        </div>
      </div>

      <!-- Main Content -->
      <main class="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div class="space-y-6">
          <ng-container [ngSwitch]="activeTab">
            <ng-container *ngSwitchCase="'scraper'">
              <div class="space-y-6">
                <app-url-input
                  [urls]="state.urls"
                  [loading]="state.loading"
                  [error]="state.error"
                  (onUrlChange)="updateUrl($event.index, $event.value)"
                  (onAddUrl)="addUrlField()"
                  (onRemoveUrl)="removeUrl($event)"
                  (onScrape)="scrapeUrls()"
                ></app-url-input>

                <app-filters
                  *ngIf="state.categories.length > 0 || state.results.length > 0"
                  [categories]="state.categories"
                  [sources]="getUniqueSources()"
                  [selectedCategories]="state.selectedCategories"
                  [selectedSources]="state.selectedSources"
                  (onToggleCategory)="toggleCategory($event)"
                  (onToggleSource)="toggleSource($event)"
                ></app-filters>

                <app-results-grid
                  *ngIf="filteredResults.length > 0"
                  [results]="filteredResults"
                ></app-results-grid>

                <div
                  *ngIf="!state.loading && filteredResults.length === 0"
                  class="text-center py-12"
                >
                  <div class="rounded-full bg-gray-100 w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <span class="material-symbols-outlined text-3xl text-gray-400">search</span>
                  </div>
                  <p *ngIf="state.error" class="text-red-500">{{ state.error }}</p>
                  <p *ngIf="!state.error" class="text-gray-500">
                    No results yet. Start by adding URLs and clicking "Start Scraping"
                  </p>
                </div>
              </div>
            </ng-container>

            <div *ngSwitchCase="'history'" class="bg-white/80 backdrop-blur rounded-xl shadow-sm p-8">
              <div class="flex items-center gap-3 mb-6">
                <span class="material-symbols-outlined text-2xl text-gray-400">history</span>
                <h2 class="text-xl font-semibold">Scraping History</h2>
              </div>
              <p class="text-gray-500">Coming soon: View your past scraping sessions and results.</p>
            </div>

            <div *ngSwitchCase="'settings'" class="bg-white/80 backdrop-blur rounded-xl shadow-sm p-8">
              <div class="flex items-center gap-3 mb-6">
                <span class="material-symbols-outlined text-2xl text-gray-400">settings</span>
                <h2 class="text-xl font-semibold">Settings</h2>
              </div>
              <p class="text-gray-500">Coming soon: Configure API endpoints and preferences.</p>
            </div>
          </ng-container>
        </div>
      </main>
    </div>
  `
})
export class App {
  tabs: Tab[] = [
    { id: 'scraper', label: 'Scraper', icon: 'search' },
    { id: 'history', label: 'History', icon: 'history' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ];

  activeTab: TabId = 'scraper';

  state: ScraperState = {
    urls: [''],
    results: [],
    categories: [],
    loading: false,
    selectedCategories: [],
    selectedSources: [],
    error: null,
  };

  private resultsSubject = new Subject<Event[]>();

  constructor(private scraperService: ScraperService) {}

  setActiveTab(tabId: TabId): void {
    this.activeTab = tabId;
  }

  addUrlField(): void {
    this.state = {
      ...this.state,
      urls: [...this.state.urls, ''],
      error: null,
    };
  }

  updateUrl(index: number, value: string): void {
    this.state = {
      ...this.state,
      urls: this.state.urls.map((url, i) => (i === index ? value : url)),
      error: null,
    };
  }

  removeUrl(index: number): void {
    this.state = {
      ...this.state,
      urls: this.state.urls.filter((_, i) => i !== index),
      error: null,
    };
  }

  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  scrapeUrls(): void {
    if (this.state.loading) return;

    const validUrls = this.state.urls.filter(url => url.trim() && this.isValidUrl(url));
    if (validUrls.length === 0) {
      this.state = {
        ...this.state,
        error: 'Please enter at least one valid URL',
      };
      return;
    }

    this.state = {
      ...this.state,
      loading: true,
      error: null,
      results: [], // Clear previous results
    };

    // Create an array of observables for each URL
    const scrapers = validUrls.map(url =>
      this.scraperService.scrapeUrl(url).pipe(
        map(response => response.events.events),
        catchError(error => {
          console.error(`Failed to scrape URL (${url}):`, error);
          return [];
        })
      )
    );

    // Merge all scrapers and accumulate results
    merge(...scrapers)
      .pipe(
        scan((acc: Event[], events: Event[]) => {
          // Merge new events with existing ones, removing duplicates based on URL and title
          const newEvents = events.filter(
            event => !acc.some(
              existing => 
                existing.url === event.url && 
                existing.title === event.title
            )
          );
          return [...acc, ...newEvents];
        }, [])
      )
      .subscribe({
        next: (accumulatedEvents) => {
          // Extract and deduplicate categories from all events
          const allCategories = new Set<string>();
          accumulatedEvents.forEach(event => {
            event.category.split(',')
              .map(cat => cat.trim())
              .forEach(cat => allCategories.add(cat));
          });

          this.state = {
            ...this.state,
            results: accumulatedEvents,
            categories: Array.from(allCategories),
          };
        },
        complete: () => {
          this.state = {
            ...this.state,
            loading: false,
          };
        },
        error: (error) => {
          this.state = {
            ...this.state,
            loading: false,
            error: 'Failed to scrape some URLs. Please try again.',
          };
          console.error('Scraping error:', error);
        },
      });
  }

  toggleCategory(category: string): void {
    this.state = {
      ...this.state,
      selectedCategories: this.state.selectedCategories.includes(category)
        ? this.state.selectedCategories.filter(c => c !== category)
        : [...this.state.selectedCategories, category],
    };
  }

  toggleSource(source: string): void {
    this.state = {
      ...this.state,
      selectedSources: this.state.selectedSources.includes(source)
        ? this.state.selectedSources.filter(s => s !== source)
        : [...this.state.selectedSources, source],
    };
  }

  getUniqueSources(): string[] {
    return Array.from(
      new Set(
        this.state.results
          .map(event => {
            try {
              return new URL(event.url).hostname;
            } catch {
              return '';
            }
          })
          .filter(Boolean)
      )
    );
  }

  get filteredResults(): Event[] {
    return this.state.results.filter(event => {
      try {
        const eventCategories = event.category.split(',').map(c => c.trim());
        const eventSource = new URL(event.url).hostname;

        const categoryMatch =
          this.state.selectedCategories.length === 0 ||
          eventCategories.some(cat => this.state.selectedCategories.includes(cat));

        const sourceMatch =
          this.state.selectedSources.length === 0 ||
          this.state.selectedSources.includes(eventSource);

        return categoryMatch && sourceMatch;
      } catch {
        return false;
      }
    });
  }
}

bootstrapApplication(App, {
  providers: [
    provideHttpClient()
  ]
}).catch(err => console.error(err));