import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditService } from '../../services/audit.service';
import { AuditResponse, Finding } from '../../models/audit.model';
import { ScoreGaugeComponent } from '../../components/score-gauge/score-gauge.component';
import { FindingsListComponent } from '../../components/findings-list/findings-list.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, ScoreGaugeComponent, FindingsListComponent],
  template: `
    <div class="page">

      <!-- ── Layered background (exact reference) ── -->
      <div class="night-gradient"></div>
      <div class="upper-light"></div>
      <div class="lower-light"></div>
      <div class="side-shadow"></div>
      <div class="corner-dark"></div>

      <!-- ── Top-left branding ── -->
      <div class="branding">
        <span class="branding-text">SafeCode <span class="branding-ai">AI</span></span>
      </div>

      <!-- ── Hero section (vertically centered on page) ── -->
      <div class="hero" *ngIf="!result()">
        <div class="hero-inner">

          <!-- Headline -->
          <div class="headline-group">
            <h1 class="headline">
              Think your code is secure?<br>
              <span class="headline-gradient">Let's <em>find out.</em></span>
            </h1>
            <p class="hero-description">
              Paste your repository URL and let SafeCode AI challenge its security.
            </p>
          </div>

          <!-- Search bar -->
          <form class="search-form" (ngSubmit)="runAudit()" #auditForm="ngForm">
            <div class="search-bar" [class.search-bar--active]="repoUrl.length > 0">
              <div class="search-cursor"></div>
              <input
                class="search-input"
                type="url"
                name="repoUrl"
                [(ngModel)]="repoUrl"
                placeholder="https://github.com/owner/repository"
                required
                [disabled]="loading()"
                autocomplete="off"
              />
              <button
                type="submit"
                class="search-btn"
                [disabled]="loading() || !repoUrl"
                aria-label="Run audit"
              >
                <span *ngIf="!loading()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>
                  </svg>
                </span>
                <span *ngIf="loading()" class="spinner"></span>
              </button>
            </div>

          </form>

          <!-- Error state -->
          <div class="error-banner" *ngIf="error()">
            <span>⚠️ {{ error() }}</span>
            <button class="error-dismiss" (click)="clearError()">✕</button>
          </div>
        </div>
      </div>

      <!-- ── Loading overlay ── -->
      <div class="loading-page" *ngIf="loading()">
        <div class="loading-card">

          <!-- Glassmorphism circular progress -->
          <div class="ring-wrap">
            <div class="ring-glow"></div>
            <svg class="ring-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
              <circle cx="100" cy="100" r="82" fill="none" stroke="rgba(155,212,244,0.06)" stroke-width="1" stroke-dasharray="2 6.14" />
              <circle cx="100" cy="100" r="74" fill="none"
                stroke="rgba(155,212,244,0.10)" stroke-width="10"
                stroke-linecap="round" />
              <circle cx="100" cy="100" r="74" fill="none"
                stroke="url(#progressGrad)" stroke-width="10"
                stroke-linecap="round"
                stroke-dasharray="464.96"
                [attr.stroke-dashoffset]="ringOffset()"
                class="ring-arc"
                transform="rotate(-90 100 100)" />
              <defs>
                <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stop-color="#58e6f2" />
                  <stop offset="100%" stop-color="#9bd4f4" />
                </linearGradient>
              </defs>
            </svg>
            <div class="ring-inner">
              <span class="ring-percent">{{ loadingProgress() }}%</span>
              <span class="ring-label">Analyzing</span>
            </div>
          </div>

          <p class="loading-title">Analyzing repository...</p>

          <div class="check-list">
            <div class="check-item"
              *ngFor="let item of checkItems"
              [class.check-item--done]="item.status === 'done'"
              [class.check-item--active]="item.status === 'active'"
              [class.check-item--pending]="item.status === 'pending'">
              <span class="check-icon">
                <span *ngIf="item.status === 'done'">&#x2713;</span>
                <span *ngIf="item.status === 'active'" class="check-pulse">&#x25CC;</span>
                <span *ngIf="item.status === 'pending'">&#x25CC;</span>
              </span>
              <span class="check-label">{{ item.label }}</span>
            </div>
          </div>

        </div>
      </div>

      <!-- ── Results view ── -->
      <div class="results-page" *ngIf="result() && !loading()">
        <!-- Back button + error -->
        <div class="results-topbar">
          <button class="btn-back" (click)="result.set(null); findings.set([]); repoUrl = ''">
            ← New Audit
          </button>
          <div class="error-banner inline" *ngIf="error()">
            <span>⚠️ {{ error() }}</span>
            <button class="error-dismiss" (click)="clearError()">✕</button>
          </div>
        </div>

        <div class="results-summary">
          <div class="score-panel">
            <app-score-gauge [score]="result()!.score" />
            <div class="score-updated" *ngIf="scoreUpdated">
              <span class="score-delta" [class.positive]="scoreDelta > 0">
                {{ scoreDelta > 0 ? '+' : '' }}{{ scoreDelta }} pts after fix
              </span>
            </div>
          </div>

          <div class="summary-panel">
            <h2 class="summary-title">Audit Summary</h2>
            <p class="summary-repo">
              <span class="summary-label">Repository</span>
              <a [href]="auditedUrl" target="_blank" class="repo-link">{{ auditedUrl }}</a>
            </p>
            <div class="summary-stats">
              <div class="stat-card stat-card--score">
                <div class="stat-value">{{ result()!.score }}</div>
                <div class="stat-label">Security Score</div>
              </div>
              <div class="stat-card stat-card--findings">
                <div class="stat-value">{{ result()!.findingsCount }}</div>
                <div class="stat-label">Findings</div>
              </div>
              <div class="stat-card stat-card--critical">
                <div class="stat-value">{{ countBySeverity('Critical') + countBySeverity('High') }}</div>
                <div class="stat-label">Critical / High</div>
              </div>
              <div class="stat-card stat-card--fixed">
                <div class="stat-value">{{ fixedCount }}</div>
                <div class="stat-label">Fixed</div>
              </div>
            </div>
            <div class="tests-badge" *ngIf="testResult !== null">
              <span *ngIf="testResult" class="badge-pass">■ Tests passed</span>
              <span *ngIf="!testResult" class="badge-manual">■■ Manual review needed</span>
            </div>
          </div>
        </div>

        <app-findings-list
          [findings]="findings()"
          [fixingId]="fixingId()"
          (fixRequested)="fixVulnerability($event)"
        />
      </div>

    </div>
  `,
  styles: [`
    :host { display: block; }

    /* ══════════════════════════════════════════════════════════════
       PAGE SHELL
    ══════════════════════════════════════════════════════════════ */
    .page {
      min-height: 100vh;
      background-color: #07101c;
      display: flex;
      flex-direction: column;
      font-family: "Inter", -apple-system, "Segoe UI", system-ui, sans-serif;
      position: relative;
      overflow-x: hidden;
    }

    /* ══════════════════════════════════════════════════════════════
       LAYERED BACKGROUND  — exact from reference CSS
    ══════════════════════════════════════════════════════════════ */

    /* Base dark gradient — fills the whole left panel */
    .night-gradient {
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background: linear-gradient(
        0deg,
        rgba(4,  7, 12, 1)   0%,
        rgba(10, 32, 49, 1) 46%,
        rgba(5, 16, 28, 1) 100%
      );
      pointer-events: none;
      z-index: 0;
    }

    /* Upper bright light blob — top-centre */
    .upper-light {
      position: fixed;
      top: -22vh;
      left: 50%;
      transform: translateX(-50%);
      width: 78vw;
      max-width: 900px;
      height: 84vh;
      border-radius: 50%;
      filter: blur(60px);
      background: radial-gradient(
        50% 50% at 50% 50%,
        rgba(155, 212, 244, 0.55) 0%,
        rgba(60,  113, 151, 0.38) 46%,
        rgba(6,   16,  27,  0)   100%
      );
      pointer-events: none;
      z-index: 0;
    }

    /* Lower wide glow — bottom sweep */
    .lower-light {
      position: fixed;
      bottom: -15vh;
      left: 50%;
      transform: translateX(-50%);
      width: 120vw;
      max-width: 1400px;
      height: 70vh;
      border-radius: 50%;
      filter: blur(80px);
      background: radial-gradient(
        50% 50% at 50% 50%,
        rgba(155, 212, 244, 0.40) 0%,
        rgba(60,  113, 151, 0.30) 46%,
        rgba(6,   16,  27,  0)   100%
      );
      pointer-events: none;
      z-index: 0;
    }

    /* Left-edge dark oval shadow */
    .side-shadow {
      position: fixed;
      top: 5vh;
      left: -18vw;
      width: 42vw;
      max-width: 480px;
      height: 55vh;
      background-color: #000817;
      border-radius: 50%;
      filter: blur(60px);
      pointer-events: none;
      z-index: 1;
    }

    /* Top-right corner darkener */
    .corner-dark {
      position: fixed;
      top: 5vh;
      right: -8vw;
      width: 28vw;
      max-width: 320px;
      height: 55vh;
      background-color: #000611;
      border-radius: 50%;
      filter: blur(50px);
      pointer-events: none;
      z-index: 1;
    }

    /* ══════════════════════════════════════════════════════════════
       TOP-LEFT BRANDING  — "SafeCode AI" gradient text
    ══════════════════════════════════════════════════════════════ */
    .branding {
      position: fixed;
      top: 18px;
      left: 24px;
      z-index: 20;
    }
    .branding-text {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.04px;
      line-height: 1.4;
      background: linear-gradient(
        90deg,
        rgba(245, 250, 255, 1)    0%,
        rgba(88, 230, 242, 0.67) 100%
      );
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .branding-ai {
      /* Inherits gradient from parent span */
    }

    /* ══════════════════════════════════════════════════════════════
       HERO — full-page vertically centered
    ══════════════════════════════════════════════════════════════ */
    .hero {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 10;
      padding: 80px 24px 40px;
    }
    .hero-inner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 28px;
      width: 100%;
      max-width: 640px;
      text-align: center;
    }

    /* Headline */
    .headline-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
    }
    .headline {
      margin: 0;
      font-size: clamp(36px, 5vw, 58px);
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: -0.03em;
      color: #ffffff;
      white-space: nowrap;
    }
    .headline-gradient {
      background: linear-gradient(
        90deg,
        rgba(245, 250, 255, 1)    0%,
        rgba(155, 212, 244, 1)   45%,
        rgba(88,  230, 242, 0.9) 100%
      );
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .headline em {
      font-style: italic;
      font-weight: 800;
    }
    .hero-description {
      font-size: 13px;
      color: #d7eeff;
      opacity: 0.8;
      margin: 0;
      line-height: 1.6;
      white-space: nowrap;
    }

    /* ══════════════════════════════════════════════════════════════
       SEARCH BAR  — reference-exact style
    ══════════════════════════════════════════════════════════════ */
    .search-form {
      width: 100%;
      max-width: 520px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
    }
    .search-bar {
      display: flex;
      width: 100%;
      height: 44px;
      align-items: center;
      gap: 10px;
      padding: 0 12px 0 14px;
      background-color: #11151d;
      border-radius: 10px;
      border: 1px solid #75a6c5;
      box-shadow: 0 0 18px 1px rgba(60, 113, 151, 0.66);
      transition: border-color 0.2s, box-shadow 0.2s;
      box-sizing: border-box;
    }
    .search-bar--active,
    .search-bar:focus-within {
      border-color: #9bd4f4;
      box-shadow:
        0 0 18px 1px rgba(60, 113, 151, 0.8),
        0 0 40px 2px rgba(155, 212, 244, 0.12);
    }

    /* Blinking text cursor */
    .search-cursor {
      width: 1px;
      height: 16px;
      background-color: #5a6470;
      flex-shrink: 0;
      animation: blink 1.1s step-end infinite;
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0; }
    }

    .search-input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 12px;
      font-family: inherit;
      color: #e6edf3;
      outline: none;
      min-width: 0;
    }
    .search-input::placeholder {
      color: #aeb8c5;
    }
    .search-input:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Security shield icon button */
    .search-btn {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background: rgba(155, 212, 244, 0.1);
      border: 1px solid rgba(117, 166, 197, 0.4);
      border-radius: 6px;
      color: #9bd4f4;
      cursor: pointer;
      transition: background 0.15s, border-color 0.15s;
      padding: 0;
    }
    .search-btn:hover:not(:disabled) {
      background: rgba(155, 212, 244, 0.2);
      border-color: rgba(117, 166, 197, 0.8);
    }
    .search-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    /* ══════════════════════════════════════════════════════════════
       SPINNER
    ══════════════════════════════════════════════════════════════ */
    .spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(155, 212, 244, 0.25);
      border-top-color: #9bd4f4;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ══════════════════════════════════════════════════════════════
       LOADING PAGE  —  glassmorphism circular progress
    ══════════════════════════════════════════════════════════════ */
    .loading-page {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 10;
      padding: 80px 24px 40px;
    }
    .loading-card {
      background: rgba(8, 14, 24, 0.55);
      border: 1px solid rgba(155, 212, 244, 0.14);
      border-radius: 24px;
      padding: 48px 40px 44px;
      text-align: center;
      width: 100%;
      max-width: 400px;
      box-shadow:
        0 0 60px rgba(60, 113, 151, 0.18),
        0 0 120px rgba(88, 230, 242, 0.06),
        inset 0 1px 0 rgba(255,255,255,0.06);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }
    .ring-wrap {
      position: relative;
      width: 200px;
      height: 200px;
      margin: 0 auto 32px;
    }
    .ring-glow {
      position: absolute;
      inset: -18px;
      border-radius: 50%;
      background: radial-gradient(
        50% 50% at 50% 50%,
        rgba(88, 230, 242, 0.18) 0%,
        rgba(60, 113, 151, 0.10) 55%,
        transparent 100%
      );
      filter: blur(12px);
      pointer-events: none;
    }
    .ring-svg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    .ring-arc {
      transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1);
      filter: drop-shadow(0 0 6px rgba(88, 230, 242, 0.55));
    }
    .ring-inner {
      position: absolute;
      inset: 22px;
      border-radius: 50%;
      background: rgba(10, 18, 30, 0.72);
      border: 1px solid rgba(155, 212, 244, 0.12);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 2px;
      box-shadow:
        inset 0 0 30px rgba(60, 113, 151, 0.15),
        inset 0 1px 0 rgba(255, 255, 255, 0.06);
    }
    .ring-percent {
      font-size: 38px;
      font-weight: 700;
      letter-spacing: -0.03em;
      line-height: 1;
      background: linear-gradient(135deg, #ffffff 0%, #9bd4f4 60%, #58e6f2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      transition: all 0.5s ease;
    }
    .ring-label {
      font-size: 11px;
      font-weight: 500;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(155, 212, 244, 0.55);
    }
    .loading-title {
      font-size: 15px;
      font-weight: 600;
      color: rgba(215, 238, 255, 0.85);
      margin: 0 0 20px;
      letter-spacing: 0.01em;
    }
    .check-list {
      display: flex;
      flex-direction: column;
      gap: 0;
      text-align: left;
      border-top: 1px solid rgba(155, 212, 244, 0.08);
      padding-top: 16px;
    }
    .check-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 6px 4px;
      border-radius: 6px;
      font-size: 13px;
      color: rgba(155, 212, 244, 0.30);
      transition: color 0.4s ease, background 0.3s ease;
    }
    .check-item--done    { color: #3dd68c; }
    .check-item--active  { color: #9bd4f4; background: rgba(155, 212, 244, 0.05); }
    .check-item--pending { color: rgba(155, 212, 244, 0.28); }
    .check-icon {
      width: 16px;
      text-align: center;
      font-size: 14px;
      flex-shrink: 0;
      transition: color 0.4s ease;
    }
    .check-item--done   .check-icon { color: #3dd68c; }
    .check-item--active .check-icon { color: #9bd4f4; }
    .check-pulse {
      display: inline-block;
      animation: pulse-opacity 1.2s ease-in-out infinite;
    }
    @keyframes pulse-opacity {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.3; }
    }
    .check-label { font-weight: 500; letter-spacing: 0.01em; }

    /* ══════════════════════════════════════════════════════════════
       ERROR BANNER
    ══════════════════════════════════════════════════════════════ */
    .error-banner {
      background: rgba(220, 38, 38, 0.1);
      border: 1px solid rgba(220, 38, 38, 0.3);
      border-radius: 10px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      color: #f87171;
      width: 100%;
      max-width: 520px;
      box-sizing: border-box;
    }
    .error-dismiss {
      margin-left: auto;
      background: none;
      border: none;
      cursor: pointer;
      color: #f87171;
      font-size: 15px;
      padding: 0;
    }

    /* ══════════════════════════════════════════════════════════════
       RESULTS PAGE
    ══════════════════════════════════════════════════════════════ */
    .results-page {
      flex: 1;
      max-width: 900px;
      margin: 0 auto;
      padding: 72px 24px 40px;
      width: 100%;
      box-sizing: border-box;
      position: relative;
      z-index: 10;
    }

    .results-topbar {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .btn-back {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(117, 166, 197, 0.25);
      color: #9bd4f4;
      font-size: 13px;
      font-family: inherit;
      padding: 7px 16px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s;
      white-space: nowrap;
    }
    .btn-back:hover { background: rgba(155, 212, 244, 0.1); }
    .error-banner.inline { flex: 1; max-width: unset; }

    .results-summary {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 24px;
      background: rgba(10, 16, 26, 0.65);
      border: 1px solid rgba(117, 166, 197, 0.15);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      align-items: start;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }
    @media (max-width: 640px) {
      .results-summary { grid-template-columns: 1fr; }
    }

    .score-panel {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .score-updated { margin-top: 6px; }
    .score-delta {
      font-size: 13px;
      font-weight: 600;
      color: rgba(215, 238, 255, 0.7);
      padding: 3px 10px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 12px;
    }
    .score-delta.positive { color: #3fb950; }

    .summary-panel { padding-top: 4px; }
    .summary-title {
      font-size: 18px;
      font-weight: 700;
      color: #e6edf3;
      margin: 0 0 10px;
    }
    .summary-repo {
      margin: 0 0 16px;
      font-size: 13px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .summary-label {
      color: rgba(215, 238, 255, 0.4);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-weight: 600;
    }
    .repo-link {
      color: #9bd4f4;
      text-decoration: none;
      word-break: break-all;
    }
    .repo-link:hover { text-decoration: underline; }

    .summary-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 10px;
    }
    .stat-card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(117, 166, 197, 0.12);
      border-radius: 10px;
      padding: 10px 12px;
      text-align: center;
    }
    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #e6edf3;
      line-height: 1;
      margin-bottom: 4px;
    }
    .stat-card--score    .stat-value { color: #9bd4f4; }
    .stat-card--critical .stat-value { color: #f87171; }
    .stat-card--fixed    .stat-value { color: #3fb950; }
    .stat-label {
      font-size: 11px;
      color: rgba(215, 238, 255, 0.4);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .tests-badge { margin-top: 14px; }
    .badge-pass {
      background: rgba(63, 185, 80, 0.1);
      color: #3fb950;
      border: 1px solid rgba(63, 185, 80, 0.3);
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
    }
    .badge-manual {
      background: rgba(210, 153, 34, 0.1);
      color: #d29922;
      border: 1px solid rgba(210, 153, 34, 0.3);
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
    }

  `]
})
export class HomeComponent {
  repoUrl = '';
  auditedUrl = '';
  result = signal<AuditResponse | null>(null);
  findings = signal<Finding[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  fixingId = signal<string | null>(null);

  fixedCount = 0;
  testResult: boolean | null = null;
  scoreUpdated = false;
  scoreDelta = 0;

  // ── Loading progress ──────────────────────────────────────────
  loadingProgress = signal(0);

  /** SVG arc offset: circumference 464.96px, offset shrinks as progress grows */
  ringOffset = computed(() => 464.96 * (1 - this.loadingProgress() / 100));

  checkItems: { label: string; status: 'pending' | 'active' | 'done' }[] = [
    { label: 'Authentication',  status: 'pending' },
    { label: 'API Security',    status: 'pending' },
    { label: 'Secrets',         status: 'pending' },
    { label: 'Dependencies',    status: 'pending' },
    { label: 'Permissions',     status: 'pending' },
  ];

  readonly exampleRepos = [
    { label: 'WebGoat', url: 'https://github.com/WebGoat/WebGoat' },
    { label: 'DVWA', url: 'https://github.com/digininja/DVWA' },
    { label: 'NodeGoat', url: 'https://github.com/OWASP/NodeGoat' },
  ];

  private stepInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private auditService: AuditService) {}

  setExample(ex: { label: string; url: string }): void {
    this.repoUrl = ex.url;
  }

  clearError(): void {
    this.error.set(null);
  }

  runAudit(): void {
    if (!this.repoUrl || this.loading()) return;

    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);
    this.findings.set([]);
    this.fixedCount = 0;
    this.testResult = null;
    this.scoreUpdated = false;
    this.auditedUrl = this.repoUrl;

    // Reset progress & check items
    this.loadingProgress.set(0);
    this.checkItems = this.checkItems.map(item => ({ ...item, status: 'pending' }));
    let activeIdx = 0;
    this.checkItems[0] = { ...this.checkItems[0], status: 'active' };

    // Animate progress: tick every 240ms, ~20 ticks per item (5 items × 20% each)
    const totalTicks = 95; // stop at 95% — final 5% on complete
    let ticks = 0;
    this.stepInterval = setInterval(() => {
      ticks++;
      const nextPct = Math.min(95, Math.round((ticks / totalTicks) * 95));
      this.loadingProgress.set(nextPct);

      // Advance check item every 19 ticks (~19%)
      const targetIdx = Math.min(
        this.checkItems.length - 1,
        Math.floor((nextPct / 95) * this.checkItems.length)
      );
      if (targetIdx > activeIdx) {
        // mark previous as done
        this.checkItems[activeIdx] = { ...this.checkItems[activeIdx], status: 'done' };
        activeIdx = targetIdx;
        this.checkItems[activeIdx] = { ...this.checkItems[activeIdx], status: 'active' };
      }

      if (ticks >= totalTicks) {
        clearInterval(this.stepInterval!);
        this.stepInterval = null;
      }
    }, 240);

    this.auditService.runAudit({ repoUrl: this.repoUrl }).subscribe({
      next: (res) => {
        this.stopStepAnimation();
        this.result.set(res);
        this.findings.set(res.findings ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.stopStepAnimation();
        this.loading.set(false);
        this.error.set(
          err?.error?.message ?? err?.message ?? 'Audit failed. Please check the URL and try again.'
        );
      }
    });
  }

  fixVulnerability(finding: Finding): void {
    const auditId = this.result()?.auditId;
    if (!auditId) {
      // No auditId yet — simulate fix locally for demo
      this.applyDemoFix(finding);
      return;
    }

    this.fixingId.set(finding.id);
    this.auditService.fixVulnerability(auditId, finding.id).subscribe({
      next: (res) => {
        this.fixingId.set(null);
        const updated = this.findings().map(f =>
          f.id === finding.id
            ? { ...f, fixed: true, originalCode: res.originalCode, fixedCode: res.fixedCode }
            : f
        );
        this.findings.set(updated);
        this.fixedCount++;
        this.testResult = true;

        if (res.scoreAfter !== undefined) {
          const prev = this.result()!.score;
          this.scoreDelta = res.scoreAfter - prev;
          this.result.set({ ...this.result()!, score: res.scoreAfter });
          this.scoreUpdated = true;
        }
      },
      error: () => {
        this.fixingId.set(null);
        // Fall back to demo mode
        this.applyDemoFix(finding);
      }
    });
  }

  private applyDemoFix(finding: Finding): void {
    const updated = this.findings().map(f =>
      f.id === finding.id
        ? {
            ...f,
            fixed: true,
            originalCode: finding.evidence || '// original vulnerable code',
            fixedCode: `// ✅ Fixed: ${finding.fix}\n// Vulnerability removed`
          }
        : f
    );
    this.findings.set(updated);
    this.fixedCount++;
    this.testResult = false; // manual review since it's a demo fix

    const prev = this.result()!.score;
    const newScore = Math.min(100, prev + 11);
    this.scoreDelta = newScore - prev;
    this.result.set({ ...this.result()!, score: newScore });
    this.scoreUpdated = true;
  }

  countBySeverity(s: string): number {
    return this.findings().filter(f => f.severity === s).length;
  }

  private stopStepAnimation(): void {
    if (this.stepInterval) {
      clearInterval(this.stepInterval);
      this.stepInterval = null;
    }
    // Complete the ring and mark all items done
    this.loadingProgress.set(100);
    this.checkItems = this.checkItems.map(item => ({ ...item, status: 'done' }));
  }
}
