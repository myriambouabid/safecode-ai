import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Finding } from '../../models/audit.model';

@Component({
  selector: 'app-finding-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="finding-card">

      <!-- ── Header row: severity · ID · category ── fix button -->
      <div class="finding-header">
        <div class="finding-meta">
          <span class="severity-badge" [class]="'severity-badge--' + finding.severity.toLowerCase()">
            {{ finding.severity.toUpperCase() }}
          </span>
          <span class="finding-id">{{ finding.id }}</span>
          <span class="finding-category">{{ finding.category }}</span>
        </div>

        <div class="finding-actions" *ngIf="!finding.fixed">
          <button class="btn-fix" (click)="onFix()" [disabled]="fixing">
            <span *ngIf="!fixing" class="btn-fix-content">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
              Fix vulnerability
            </span>
            <span *ngIf="fixing" class="spinner-inline">
              <span class="btn-spinner"></span>
              Fixing…
            </span>
          </button>
        </div>

        <div class="finding-fixed-badge" *ngIf="finding.fixed">
          <span class="badge-fixed">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Fixed
          </span>
        </div>
      </div>

      <!-- ── Body ── -->
      <div class="finding-body">
        <!-- Issue title -->
        <p class="finding-issue">{{ finding.issue }}</p>

        <!-- File + line badges -->
        <div class="finding-location">
          <span class="file-badge">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            {{ finding.file }}
          </span>
          <span class="line-badge">line {{ finding.line }}</span>
        </div>

        <!-- Evidence -->
        <div class="finding-evidence" *ngIf="finding.evidence">
          <div class="section-label">EVIDENCE</div>
          <div class="evidence-block">
            <code class="evidence-snippet">{{ finding.evidence }}</code>
          </div>
        </div>

        <!-- Recommendation -->
        <div class="finding-recommendation" *ngIf="finding.fix">
          <svg class="rec-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div class="rec-copy">
            <div class="section-label rec-label">RECOMMENDATION</div>
            <p class="rec-text">{{ finding.fix }}</p>
          </div>
        </div>

        <!-- Diff view after AI fix -->
        <div class="diff-view" *ngIf="finding.fixed && finding.originalCode && finding.fixedCode">
          <div class="diff-header">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            <span class="diff-title">Code Changes</span>
          </div>
          <div class="diff-content">
            <div class="diff-before">
              <div class="diff-panel-label diff-panel-label--removed">Before</div>
              <pre class="diff-code diff-code--removed">{{ finding.originalCode }}</pre>
            </div>
            <div class="diff-after">
              <div class="diff-panel-label diff-panel-label--added">After</div>
              <pre class="diff-code diff-code--added">{{ finding.fixedCode }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* ── Card shell ── */
    .finding-card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.10);
      border-radius: 12px;
      margin-bottom: 16px;
      overflow: hidden;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      transition: background 0.18s;
    }
    .finding-card:hover {
      background: rgba(255, 255, 255, 0.06);
    }

    /* ── Header ── */
    .finding-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.07);
      gap: 10px;
      flex-wrap: wrap;
    }
    .finding-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    /* Severity badge */
    .severity-badge {
      padding: 3px 10px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #fff;
    }
    .severity-badge--critical { background: #dc2626; }
    .severity-badge--high     { background: #ef4444; }
    .severity-badge--medium   { background: #d29922; }
    .severity-badge--low      { background: #3b82f6; }

    .finding-id {
      font-size: 12px;
      font-weight: 500;
      color: rgba(201, 201, 202, 0.75);
      font-family: 'SF Mono', 'Fira Code', monospace;
      letter-spacing: 0.02em;
    }
    .finding-category {
      font-size: 12px;
      color: rgba(201, 201, 202, 0.60);
    }

    /* ── Fix button ── */
    .btn-fix {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(255, 255, 255, 0.06);
      color: #e2e8f0;
      border: 1px solid rgba(255, 255, 255, 0.18);
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      font-family: inherit;
      transition: background 0.15s, border-color 0.15s;
      white-space: nowrap;
      letter-spacing: 0.01em;
    }
    .btn-fix-content {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-fix:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.32);
      color: #fff;
    }
    .btn-fix:disabled { opacity: 0.4; cursor: not-allowed; }

    .badge-fixed {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      font-weight: 600;
      color: #45c75d;
      background: rgba(69, 199, 93, 0.1);
      border: 1px solid rgba(69, 199, 93, 0.25);
      padding: 4px 12px;
      border-radius: 20px;
    }

    /* ── Body ── */
    .finding-body {
      padding: 16px 20px 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    /* Issue title — bold, white, matches screenshot */
    .finding-issue {
      font-size: 14px;
      font-weight: 700;
      color: #dce8ef;
      margin: 0;
      line-height: 1.5;
    }

    /* File + line row */
    .finding-location {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .file-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: rgba(28, 43, 55, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      padding: 3px 9px;
      font-size: 11px;
      color: #7d98a8;
      font-family: 'SF Mono', 'Fira Code', monospace;
    }
    .line-badge {
      background: rgba(28, 43, 55, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      padding: 3px 9px;
      font-size: 11px;
      color: #7d98a8;
      font-family: 'SF Mono', 'Fira Code', monospace;
    }

    /* Evidence */
    .section-label {
      font-size: 10px;
      font-weight: 700;
      color: #7d98a8;
      letter-spacing: 0.10em;
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    .evidence-block {
      background: rgba(10, 16, 28, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 6px;
      padding: 12px 14px;
    }
    .evidence-snippet {
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 12px;
      color: #a9bbc5;
      white-space: pre-wrap;
      word-break: break-all;
      line-height: 1.5;
    }

    /* Recommendation */
    .finding-recommendation {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }
    .rec-icon {
      color: #45c75d;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .rec-copy { display: flex; flex-direction: column; gap: 3px; }
    .rec-label { color: #45c75d !important; }
    .rec-text {
      font-size: 13px;
      color: #7d98a8;
      margin: 0;
      line-height: 1.55;
    }

    /* ── Diff view ── */
    .diff-view {
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 8px;
      overflow: hidden;
      background: rgba(4, 8, 16, 0.4);
    }
    .diff-header {
      background: rgba(255, 255, 255, 0.025);
      padding: 8px 14px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      gap: 6px;
      color: rgba(139, 148, 158, 0.5);
    }
    .diff-title {
      font-size: 10px;
      font-weight: 700;
      color: rgba(139, 148, 158, 0.5);
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .diff-content {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
    @media (max-width: 560px) {
      .diff-content { grid-template-columns: 1fr; }
    }
    .diff-before { border-right: 1px solid rgba(255, 255, 255, 0.06); }
    .diff-panel-label {
      padding: 5px 12px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .diff-panel-label--removed {
      background: rgba(248, 113, 113, 0.07);
      color: #f87171;
      border-bottom: 1px solid rgba(248,113,113,0.1);
    }
    .diff-panel-label--added {
      background: rgba(63, 185, 80, 0.07);
      color: #3fb950;
      border-bottom: 1px solid rgba(63,185,80,0.1);
    }
    .diff-code {
      padding: 12px;
      font-size: 11px;
      font-family: 'SF Mono', 'Fira Code', monospace;
      margin: 0;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
      min-height: 50px;
      color: #c9d1d9;
      line-height: 1.55;
    }
    .diff-code--removed { background: rgba(248, 113, 113, 0.05); }
    .diff-code--added   { background: rgba(63, 185, 80, 0.05); }

    /* ── Inline spinner ── */
    .spinner-inline {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-spinner {
      display: inline-block;
      width: 10px;
      height: 10px;
      border: 1.5px solid rgba(255,255,255,0.2);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  `]
})
export class FindingCardComponent {
  @Input() finding!: Finding;
  @Input() fixing = false;
  @Output() fixRequested = new EventEmitter<Finding>();

  onFix(): void {
    this.fixRequested.emit(this.finding);
  }
}
