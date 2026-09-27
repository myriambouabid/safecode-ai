import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Finding } from '../../models/audit.model';
import { FindingCardComponent } from '../finding-card/finding-card.component';

@Component({
  selector: 'app-findings-list',
  standalone: true,
  imports: [CommonModule, FindingCardComponent],
  template: `
    <div class="findings-list">
      <div class="findings-header">
        <h2 class="findings-title">
          Security Findings
          <span class="findings-count">{{ findings.length }}</span>
        </h2>
        <div class="findings-filter">
          <button
            *ngFor="let s of severities"
            class="filter-btn"
            [class.filter-btn--active]="activeSeverity === s"
            (click)="setFilter(s)"
          >
            <span class="filter-dot" [class]="'filter-dot--' + s.toLowerCase()"></span>
            {{ s }}
            <span class="filter-count">{{ countBySeverity(s) }}</span>
          </button>
          <button
            class="filter-btn"
            [class.filter-btn--active]="activeSeverity === 'All'"
            (click)="setFilter('All')"
          >
            All <span class="filter-count">{{ findings.length }}</span>
          </button>
        </div>
      </div>

      <div *ngIf="filteredFindings.length === 0" class="findings-empty">
        <p>No findings match this filter.</p>
      </div>

      <app-finding-card
        *ngFor="let f of filteredFindings; trackBy: trackById"
        [finding]="f"
        [fixing]="fixingId === f.id"
        (fixRequested)="fixRequested.emit($event)"
      />
    </div>
  `,
  styles: [`
    .findings-list {
      margin-top: 32px;
    }
    .findings-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 16px;
    }
    .findings-title {
      font-size: 18px;
      font-weight: 700;
      color: #e6edf3;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .findings-count {
      background: rgba(255, 255, 255, 0.08);
      color: rgba(139, 148, 158, 0.8);
      font-size: 13px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 12px;
    }
    .findings-filter {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .filter-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      background: rgba(255, 255, 255, 0.04);
      border-radius: 16px;
      cursor: pointer;
      font-size: 12px;
      color: rgba(139, 148, 158, 0.8);
      transition: all 0.15s;
    }
    .filter-btn--active {
      background: rgba(0, 200, 230, 0.12);
      color: #00c8e6;
      border-color: rgba(0, 200, 230, 0.4);
    }
    .filter-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      display: inline-block;
    }
    .filter-dot--critical { background: #f87171; }
    .filter-dot--high     { background: #f97316; }
    .filter-dot--medium   { background: #d29922; }
    .filter-dot--low      { background: #58a6ff; }
    .filter-count {
      background: rgba(255,255,255,0.1);
      padding: 0 5px;
      border-radius: 8px;
      font-size: 11px;
    }
    .filter-btn--active .filter-count {
      background: rgba(0, 200, 230, 0.2);
    }
    .findings-empty {
      text-align: center;
      padding: 32px;
      color: rgba(139, 148, 158, 0.7);
      font-size: 14px;
    }
  `]
})
export class FindingsListComponent implements OnChanges {
  @Input() findings: Finding[] = [];
  @Input() fixingId: string | null = null;
  @Output() fixRequested = new EventEmitter<Finding>();

  readonly severities = ['Critical', 'High', 'Medium', 'Low'];
  activeSeverity = 'All';
  filteredFindings: Finding[] = [];

  ngOnChanges(): void {
    this.applyFilter();
  }

  setFilter(s: string): void {
    this.activeSeverity = s;
    this.applyFilter();
  }

  applyFilter(): void {
    this.filteredFindings = this.activeSeverity === 'All'
      ? this.findings
      : this.findings.filter(f => f.severity === this.activeSeverity);
  }

  countBySeverity(s: string): number {
    return this.findings.filter(f => f.severity === s).length;
  }

  trackById(_: number, f: Finding): string {
    return f.id;
  }
}
