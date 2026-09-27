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
      <!-- Title row -->
      <div class="findings-header">
        <div class="title-group">
          <h2 class="findings-title">Security Findings</h2>
          <div class="info-badge">i</div>
        </div>

        <!-- Filter pill group — matches reference exactly -->
        <div class="filter-pills">
          <button
            class="pill pill--all"
            [class.pill--active]="activeSeverity === 'All'"
            (click)="setFilter('All')"
          >All</button>
          <button
            *ngFor="let s of severities"
            class="pill"
            [class.pill--active]="activeSeverity === s"
            (click)="setFilter(s)"
          >{{ s }}</button>
        </div>
      </div>

      <!-- Empty state -->
      <div *ngIf="filteredFindings.length === 0" class="findings-empty">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
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
    .findings-list { margin-top: 0; }

    /* ── Header ── */
    .findings-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 20px;
    }

    /* Title + info icon */
    .title-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .findings-title {
      font-size: 22px;
      font-weight: 900;
      color: #f3f8fb;
      margin: 0;
      letter-spacing: -0.02em;
    }
    .info-badge {
      display: flex;
      width: 18px;
      height: 18px;
      align-items: center;
      justify-content: center;
      background: rgba(60, 113, 151, 0.43);
      border-radius: 50%;
      font-size: 10px;
      font-weight: 700;
      color: #7d98a8;
      flex-shrink: 0;
    }

    /* ── Filter pill group — reference style ── */
    .filter-pills {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 4px;
      background: rgba(255, 255, 255, 0.07);
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 10px;
    }
    .pill {
      padding: 6px 16px;
      border: none;
      background: transparent;
      border-radius: 7px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      font-family: inherit;
      color: rgba(255, 255, 255, 0.55);
      transition: background 0.15s, color 0.15s;
      letter-spacing: 0.01em;
      white-space: nowrap;
    }
    .pill:hover:not(.pill--active) {
      color: rgba(255, 255, 255, 0.85);
    }
    .pill--active {
      background: #ffffff;
      color: #111827;
    }

    /* ── Empty state ── */
    .findings-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 40px 24px;
      color: rgba(139, 148, 158, 0.55);
      font-size: 14px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
    }
    .findings-empty p { margin: 0; }
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
