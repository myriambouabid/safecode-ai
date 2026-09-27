import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Finding } from '../../models/audit.model';

@Component({
  selector: 'app-finding-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="finding-card" [class]="'finding-card--' + finding.severity.toLowerCase()">
      <div class="finding-header">
        <div class="finding-meta">
          <span class="severity-badge" [class]="'severity-badge--' + finding.severity.toLowerCase()">
            {{ finding.severity }}
          </span>
          <span class="finding-id">{{ finding.id }}</span>
          <span class="finding-category">{{ finding.category }}</span>
        </div>
        <div class="finding-actions" *ngIf="!finding.fixed">
          <button
            class="btn btn-fix"
            (click)="onFix()"
            [disabled]="fixing"
          >
            <span *ngIf="!fixing">🔧 Fix vulnerability</span>
            <span *ngIf="fixing" class="spinner-inline">Fixing…</span>
          </button>
        </div>
        <div class="finding-fixed-badge" *ngIf="finding.fixed">
          <span class="badge-fixed">✅ Fixed</span>
        </div>
      </div>

      <div class="finding-body">
        <p class="finding-issue">{{ finding.issue }}</p>

        <div class="finding-location">
          <span class="location-icon">📄</span>
          <code>{{ finding.file }}</code>
          <span class="line-badge">line {{ finding.line }}</span>
        </div>

        <div class="finding-evidence" *ngIf="finding.evidence">
          <div class="evidence-label">Evidence</div>
          <pre class="evidence-code">{{ finding.evidence }}</pre>
        </div>

        <div class="finding-fix-suggestion" *ngIf="finding.fix">
          <div class="fix-label">💡 Recommendation</div>
          <p class="fix-text">{{ finding.fix }}</p>
        </div>

        <!-- Diff view after AI fix -->
        <div class="diff-view" *ngIf="finding.fixed && finding.originalCode && finding.fixedCode">
          <div class="diff-header">
            <span class="diff-title">Code changes</span>
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
    .finding-card {
      background: rgba(13, 17, 23, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 12px;
      margin-bottom: 10px;
      overflow: hidden;
      border-left: 3px solid rgba(255, 255, 255, 0.1);
      transition: border-color 0.2s, box-shadow 0.2s;
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
    }
    .finding-card:hover {
      box-shadow: 0 2px 16px rgba(0, 0, 0, 0.3);
    }
    .finding-card--critical { border-left-color: #f87171; }
    .finding-card--high     { border-left-color: #f97316; }
    .finding-card--medium   { border-left-color: #d29922; }
    .finding-card--low      { border-left-color: #58a6ff; }

    .finding-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      flex-wrap: wrap;
      gap: 8px;
    }
    .finding-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .severity-badge {
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .severity-badge--critical { background: rgba(248, 113, 113, 0.12); color: #f87171; border: 1px solid rgba(248,113,113,0.25); }
    .severity-badge--high     { background: rgba(249, 115, 22, 0.12);  color: #f97316; border: 1px solid rgba(249,115,22,0.25); }
    .severity-badge--medium   { background: rgba(210, 153, 34, 0.12);  color: #d29922; border: 1px solid rgba(210,153,34,0.25); }
    .severity-badge--low      { background: rgba(88, 166, 255, 0.12);  color: #58a6ff; border: 1px solid rgba(88,166,255,0.25); }

    .finding-id {
      font-size: 12px;
      font-weight: 600;
      color: rgba(139, 148, 158, 0.7);
      font-family: monospace;
    }
    .finding-category {
      font-size: 12px;
      color: rgba(139, 148, 158, 0.7);
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 2px 8px;
      border-radius: 4px;
    }

    .btn-fix {
      background: rgba(0, 200, 230, 0.1);
      color: #00c8e6;
      border: 1px solid rgba(0, 200, 230, 0.3);
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s, border-color 0.15s;
    }
    .btn-fix:hover:not(:disabled) {
      background: rgba(0, 200, 230, 0.2);
      border-color: rgba(0, 200, 230, 0.6);
    }
    .btn-fix:disabled { opacity: 0.5; cursor: not-allowed; }

    .badge-fixed {
      font-size: 13px;
      color: #3fb950;
      font-weight: 600;
    }

    .finding-body {
      padding: 14px 16px;
    }
    .finding-issue {
      font-size: 14px;
      color: #e6edf3;
      margin: 0 0 10px;
      font-weight: 500;
      line-height: 1.5;
    }
    .finding-location {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
      font-size: 13px;
    }
    .finding-location code {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 12px;
      color: rgba(139, 148, 158, 0.85);
    }
    .line-badge {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 1px 7px;
      border-radius: 10px;
      font-size: 12px;
      color: rgba(139, 148, 158, 0.8);
    }

    .evidence-label, .fix-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      color: rgba(139, 148, 158, 0.6);
      letter-spacing: 0.06em;
      margin-bottom: 4px;
    }
    .evidence-code {
      background: rgba(8, 12, 16, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: 6px;
      padding: 8px 10px;
      font-size: 12px;
      overflow-x: auto;
      margin: 0 0 10px;
      white-space: pre-wrap;
      word-break: break-all;
      color: #e6edf3;
    }
    .fix-text {
      font-size: 13px;
      color: rgba(139, 148, 158, 0.85);
      line-height: 1.6;
      margin: 0;
    }

    /* Diff view */
    .diff-view {
      margin-top: 12px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      overflow: hidden;
    }
    .diff-header {
      background: rgba(255, 255, 255, 0.03);
      padding: 8px 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    .diff-title {
      font-size: 12px;
      font-weight: 600;
      color: rgba(139, 148, 158, 0.6);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .diff-content {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
    @media (max-width: 640px) {
      .diff-content { grid-template-columns: 1fr; }
    }
    .diff-before { border-right: 1px solid rgba(255, 255, 255, 0.07); }
    .diff-panel-label {
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .diff-panel-label--removed { background: rgba(248, 113, 113, 0.08); color: #f87171; }
    .diff-panel-label--added   { background: rgba(63, 185, 80, 0.08);   color: #3fb950; }
    .diff-code {
      padding: 10px;
      font-size: 12px;
      margin: 0;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
      min-height: 60px;
      color: #e6edf3;
    }
    .diff-code--removed { background: rgba(248, 113, 113, 0.06); }
    .diff-code--added   { background: rgba(63, 185, 80, 0.06);   }

    .spinner-inline {
      display: inline-block;
      animation: pulse 1s infinite;
    }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
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
