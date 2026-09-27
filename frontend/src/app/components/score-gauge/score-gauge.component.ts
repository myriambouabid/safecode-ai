import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-score-gauge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="gauge-wrap">
      <svg class="gauge-svg" viewBox="0 0 180 130" xmlns="http://www.w3.org/2000/svg">
        <!-- Track arc: 240° span from 150° to 30° (via 390°) -->
        <path
          [attr.d]="trackPath"
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          stroke-width="12"
          stroke-linecap="round"
        />
        <!-- Progress arc -->
        <path
          [attr.d]="trackPath"
          fill="none"
          [attr.stroke]="scoreColor"
          stroke-width="12"
          stroke-linecap="round"
          [attr.stroke-dasharray]="trackLength"
          [attr.stroke-dashoffset]="dashOffset"
          class="gauge-arc"
        />
        <!-- Score number -->
        <text x="90" y="95" text-anchor="middle" class="gauge-score" fill="white">{{ score }}</text>
      </svg>
      <div class="gauge-sub">/100</div>
      <div class="gauge-rating" [style.color]="scoreColor">{{ grade }}</div>
    </div>
  `,
  styles: [`
    .gauge-wrap {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 170px;
    }
    .gauge-svg {
      width: 170px;
      height: 125px;
      overflow: visible;
    }
    .gauge-arc {
      transition: stroke-dashoffset 1.1s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .gauge-score {
      font-size: 44px;
      font-weight: 800;
      font-family: -apple-system, "Segoe UI", system-ui, sans-serif;
      letter-spacing: -0.03em;
    }
    .gauge-sub {
      font-size: 13px;
      color: rgba(125, 152, 168, 0.85);
      font-family: -apple-system, "Segoe UI", system-ui, sans-serif;
      font-weight: 500;
      margin-top: -10px;
      line-height: 1;
    }
    .gauge-rating {
      font-size: 15px;
      font-weight: 700;
      font-family: -apple-system, "Segoe UI", system-ui, sans-serif;
      letter-spacing: 0.10em;
      margin-top: 6px;
      text-transform: uppercase;
    }
  `]
})
export class ScoreGaugeComponent implements OnChanges {
  @Input() score = 0;

  // Arc centred at (90, 90), radius 68, from 150° to 390° (=30°) — 240° span
  private readonly cx = 90;
  private readonly cy = 90;
  private readonly r = 68;
  private readonly startDeg = 150;
  private readonly endDeg = 390; // equivalent to 30°
  private readonly spanDeg = 240;

  trackPath = this._buildArcPath(this.startDeg, this.endDeg);
  trackLength = (Math.PI * this.r * this.spanDeg) / 180;
  dashOffset = this.trackLength;

  private _toRad(d: number) { return (d * Math.PI) / 180; }
  private _pt(deg: number) {
    return {
      x: this.cx + this.r * Math.cos(this._toRad(deg)),
      y: this.cy + this.r * Math.sin(this._toRad(deg))
    };
  }
  private _buildArcPath(startDeg: number, endDeg: number): string {
    const s = this._pt(startDeg);
    const e = this._pt(endDeg);
    // 240° span > 180°, so largeArc = 1
    return `M ${s.x.toFixed(3)} ${s.y.toFixed(3)} A ${this.r} ${this.r} 0 1 1 ${e.x.toFixed(3)} ${e.y.toFixed(3)}`;
  }

  get scoreColor(): string {
    if (this.score >= 60) return '#22c55e';  // green
    if (this.score >= 40) return '#f97316';  // orange
    return '#ef4444';                         // red
  }
  get grade(): string {
    if (this.score >= 60) return 'GOOD';
    if (this.score >= 40) return 'MEDIUM';
    return 'CRITICAL';
  }

  ngOnChanges(): void {
    const progress = Math.min(1, Math.max(0, this.score / 100));
    this.dashOffset = this.trackLength * (1 - progress);
  }
}
