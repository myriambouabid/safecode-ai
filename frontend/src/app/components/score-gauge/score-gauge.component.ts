import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-score-gauge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="gauge-container">
      <svg class="gauge-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <!-- Background circle -->
        <circle
          cx="100" cy="100" r="80"
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          stroke-width="16"
          [attr.stroke-dasharray]="circumference"
          stroke-dashoffset="0"
        />
        <!-- Score arc -->
        <circle
          cx="100" cy="100" r="80"
          fill="none"
          [attr.stroke]="scoreColor"
          stroke-width="16"
          stroke-linecap="round"
          [attr.stroke-dasharray]="circumference"
          [attr.stroke-dashoffset]="dashOffset"
          transform="rotate(-90 100 100)"
          class="score-arc"
        />
        <!-- Score text -->
        <text x="100" y="95" text-anchor="middle" class="score-number" [attr.fill]="scoreColor">
          {{ score }}
        </text>
        <text x="100" y="120" text-anchor="middle" class="score-label">/100</text>
        <text x="100" y="142" text-anchor="middle" class="score-grade" [attr.fill]="scoreColor">
          {{ grade }}
        </text>
      </svg>
    </div>
  `,
  styles: [`
    .gauge-container {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .gauge-svg {
      width: 200px;
      height: 200px;
    }
    .score-arc {
      transition: stroke-dashoffset 1s ease-in-out;
    }
    .score-number {
      font-size: 42px;
      font-weight: 700;
      font-family: -apple-system, "Segoe UI", system-ui, sans-serif;
    }
    .score-label {
      font-size: 16px;
      fill: rgba(139, 148, 158, 0.7);
      font-family: -apple-system, "Segoe UI", system-ui, sans-serif;
    }
    .score-grade {
      font-size: 18px;
      font-weight: 600;
      font-family: -apple-system, "Segoe UI", system-ui, sans-serif;
    }
  `]
})
export class ScoreGaugeComponent implements OnChanges {
  @Input() score = 0;

  readonly circumference = 2 * Math.PI * 80; // ≈ 502.65
  dashOffset = this.circumference;

  get scoreColor(): string {
    if (this.score >= 80) return '#3fb950';
    if (this.score >= 60) return '#d29922';
    if (this.score >= 40) return '#f97316';
    return '#f87171';
  }

  get grade(): string {
    if (this.score >= 80) return 'GOOD';
    if (this.score >= 60) return 'FAIR';
    if (this.score >= 40) return 'POOR';
    return 'CRITICAL';
  }

  ngOnChanges(): void {
    const progress = this.score / 100;
    this.dashOffset = this.circumference * (1 - progress);
  }
}
