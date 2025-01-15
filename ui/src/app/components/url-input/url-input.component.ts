import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-url-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white/80 backdrop-blur rounded-xl shadow-sm p-6 md:p-8">
      <div class="flex items-center gap-3 mb-6">
        <span class="material-symbols-outlined text-2xl text-blue-600">link</span>
        <h2 class="text-xl font-semibold">URLs to Scrape</h2>
      </div>

      <div class="space-y-3">
        <div 
          *ngFor="let url of urls; let i = index; trackBy: trackByIndex" 
          class="group flex items-center gap-3 animate-fadeIn"
        >
          <div class="flex-1 relative">
            <span 
              class="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-gray-400"
            >
              public
            </span>
            <input
              type="url"
              [ngModel]="urls[i]"
              (ngModelChange)="handleUrlChange(i, $event)"
              placeholder="Enter website URL to scrape"
              [class]="'w-full rounded-lg border pl-10 pr-4 py-2.5 shadow-sm transition-colors duration-200 ' + 
                (error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 
                'border-gray-300 focus:border-blue-500 focus:ring-blue-200') + 
                ' focus:ring-4 focus:outline-none'"
            />
          </div>

          <button
            *ngIf="urls.length > 1"
            (click)="onRemoveUrl.emit(i)"
            class="p-2 text-gray-400 hover:text-red-500 transition-colors duration-200 rounded-lg hover:bg-red-50"
            title="Remove URL"
          >
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
      
      <div *ngIf="error" class="mt-3 text-sm text-red-600 flex items-center gap-2">
        <span class="material-symbols-outlined text-base">error</span>
        {{ error }}
      </div>
      
      <div class="mt-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <button
          (click)="onAddUrl.emit()"
          class="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition-colors duration-200 px-3 py-2 rounded-lg hover:bg-blue-50"
        >
          <span class="material-symbols-outlined">add</span>
          Add Another URL
        </button>
        
        <button
          (click)="onScrape.emit()"
          [disabled]="loading"
          class="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow"
        >
          <span class="material-symbols-outlined text-base">{{ loading ? 'sync' : 'search' }}</span>
          <span>{{ loading ? 'This may take a while...' : 'Start Scraping' }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fadeIn {
      animation: fadeIn 0.3s ease-out;
    }
    .material-symbols-outlined {
      font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    }
  `]
})
export class UrlInputComponent implements OnInit {
  @Input() urls: string[] = [];
  @Input() loading = false;
  @Input() error: string | null = null;
  @Output() onUrlChange = new EventEmitter<{ index: number; value: string }>();
  @Output() onAddUrl = new EventEmitter<void>();
  @Output() onRemoveUrl = new EventEmitter<number>();
  @Output() onScrape = new EventEmitter<void>();

  ngOnInit() {
    if (this.urls.length === 0) {
      this.urls = [''];
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  handleUrlChange(index: number, value: string): void {
    this.onUrlChange.emit({ index, value });
  }
}