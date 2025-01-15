import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-filters',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white/80 backdrop-blur rounded-xl shadow-sm p-6 md:p-8 m-2">
      <div class="space-y-6">
        <div>
          <div class="flex items-center gap-3 mb-4">
            <span class="material-symbols-outlined text-2xl text-blue-600">category</span>
            <h3 class="text-lg font-semibold">Categories</h3>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              *ngFor="let category of categories"
              (click)="onToggleCategory.emit(category)"
              [class]="'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ' +
                (selectedCategories.includes(category)
                  ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200')"
            >
              {{ category }}
            </button>
          </div>
        </div>

        <div>
          <div class="flex items-center gap-3 mb-4">
            <span class="material-symbols-outlined text-2xl text-blue-600">public</span>
            <h3 class="text-lg font-semibold">Sources</h3>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              *ngFor="let source of sources"
              (click)="onToggleSource.emit(source)"
              [class]="'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ' +
                (selectedSources.includes(source)
                  ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200')"
            >
              {{ source }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class FiltersComponent {
  @Input() categories: string[] = [];
  @Input() sources: string[] = [];
  @Input() selectedCategories: string[] = [];
  @Input() selectedSources: string[] = [];
  @Output() onToggleCategory = new EventEmitter<string>();
  @Output() onToggleSource = new EventEmitter<string>();
}