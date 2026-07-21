import { Component, OnInit, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ReportsService } from '../../core/services/reports.service';
import type {
  CostKpisDto,
  CostPerformancePointDto,
  HealthStatus,
  PortfolioKpisDto,
  ProjectHealthDistributionDto,
  UpcomingMilestoneDto,
} from '../../core/models/api.models';
import { onActivateKey } from '../../shared/utils/a11y';
import { formatDate } from '../../shared/utils/date.util';
import { formatCompactCurrency } from '../../shared/utils/format.util';

function splitHealthLabel(status: HealthStatus): string {
  return status.replace(/([A-Z])/g, ' $1').trim();
}

const healthClasses: Record<HealthStatus, string> = {
  NotStarted: 'text-secondary',
  OnTrack: 'positive',
  AtRisk: 'warning',
  Critical: 'negative',
};

const healthBadgeClass: Record<HealthStatus, string> = {
  NotStarted: 'badge-neutral',
  OnTrack: 'badge-success',
  AtRisk: 'badge-warning',
  Critical: 'badge-error',
};

interface KpiSummaryItem {
  label: string;
  value: string;
  icon: string;
  trend: string;
  tone: 'positive' | 'negative' | 'warning';
  to?: string;
}

function formatPct(n?: number | null): string {
  if (n === undefined || n === null) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

function conicGradient(onTrack: number, atRisk: number, critical: number, total: number): string {
  if (total === 0) return 'conic-gradient(var(--color-border) 0 100%)';
  const t1 = (onTrack / total) * 100;
  const t2 = t1 + (atRisk / total) * 100;
  const t3 = t2 + (critical / total) * 100;
  return `conic-gradient(var(--color-success) 0% ${t1}%, var(--color-warning) ${t1}% ${t2}%, var(--color-error) ${t2}% ${t3}%, var(--color-border) ${t3}% 100%)`;
}

function maxCostTrend(data: CostPerformancePointDto[]): number {
  if (data.length === 0) return 1;
  return Math.max(...data.flatMap((d) => [d.planned, d.actual]), 1);
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  readonly healthClasses = healthClasses;
  readonly healthBadgeClass = healthBadgeClass;
  readonly formatDate = formatDate;
  readonly formatCompactCurrency = formatCompactCurrency;
  readonly splitHealthLabel = splitHealthLabel;

  portfolio = signal<PortfolioKpisDto | null>(null);
  cost = signal<CostKpisDto | null>(null);
  health = signal<ProjectHealthDistributionDto | null>(null);
  trend = signal<CostPerformancePointDto[]>([]);
  milestones = signal<UpcomingMilestoneDto[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  hoveredMonth = signal<string | null>(null);

  costScale = computed(() => maxCostTrend(this.trend()));

  healthCounts = computed(() => {
    const h = this.health();
    if (!h) return { onTrack: 0, atRisk: 0, critical: 0, notStarted: 0, total: 0 };
    return {
      onTrack: h.onTrack,
      atRisk: h.atRisk,
      critical: h.critical,
      notStarted: h.notStarted,
      total: h.onTrack + h.atRisk + h.critical + h.notStarted,
    };
  });

  donutBackground = computed(() => {
    const c = this.healthCounts();
    return conicGradient(c.onTrack, c.atRisk, c.critical, c.total);
  });

  kpiSummary = computed<KpiSummaryItem[] | null>(() => {
    const portfolio = this.portfolio();
    const cost = this.cost();
    if (!portfolio || !cost) return null;
    return [
      { label: 'Active Projects', value: portfolio.activeProjects.toString(), icon: 'arrow-up-right', trend: '3 this quarter', tone: 'positive', to: '/projects' },
      {
        label: 'Schedule Variance (SV)',
        value: formatPct(portfolio.scheduleVariancePct),
        icon: portfolio.scheduleVariancePct >= 0 ? 'arrow-up-right' : 'arrow-down-right',
        trend: `${Math.abs(portfolio.scheduleVariancePct).toFixed(1)}% ${portfolio.scheduleVariancePct >= 0 ? 'ahead' : 'behind'} plan`,
        tone: portfolio.scheduleVariancePct >= 0 ? 'positive' : 'negative',
      },
      {
        label: 'Cost Variance (CV)',
        value: formatPct(portfolio.costVariancePct),
        icon: portfolio.costVariancePct >= 0 ? 'arrow-up-right' : 'arrow-down-right',
        trend: portfolio.costVariancePct >= 0 ? 'Under budget' : 'Over budget',
        tone: portfolio.costVariancePct >= 0 ? 'positive' : 'negative',
        to: '/cost-control',
      },
      {
        label: 'CPI',
        value: portfolio.cpi.toFixed(2),
        icon: portfolio.cpi >= 1 ? 'arrow-up-right' : 'alert-circle',
        trend: portfolio.cpi >= 1 ? 'On target' : 'Below target',
        tone: portfolio.cpi >= 1 ? 'positive' : 'warning',
      },
      {
        label: 'SPI',
        value: portfolio.spi.toFixed(2),
        icon: portfolio.spi >= 1 ? 'arrow-up-right' : 'arrow-down-right',
        trend: portfolio.spi >= 1 ? 'Schedule on track' : 'Recovery needed',
        tone: portfolio.spi >= 1 ? 'positive' : 'negative',
      },
      {
        label: 'Open Risks',
        value: portfolio.openRisks.toString(),
        icon: portfolio.criticalRisks > 0 ? 'alert-triangle' : 'check-circle',
        trend: `${portfolio.criticalRisks} critical`,
        tone: portfolio.criticalRisks > 0 ? 'negative' : 'positive',
        to: '/risks',
      },
    ];
  });

  constructor(private reports: ReportsService, private router: Router) {}

  ngOnInit(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin([
      this.reports.getPortfolioKpis(),
      this.reports.getCostKpis(),
      this.reports.getProjectHealthDistribution(),
      this.reports.getCostPerformanceTrend(6),
      this.reports.getUpcomingMilestones(14, 10),
    ]).subscribe({
      next: ([portfolio, cost, health, trend, milestones]) => {
        this.portfolio.set(portfolio);
        this.cost.set(cost);
        this.health.set(health);
        this.trend.set(trend);
        this.milestones.set(milestones);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err instanceof Error ? err.message : 'Failed to load dashboard');
        this.loading.set(false);
      },
    });
  }

  barHeight(value: number): number {
    const scale = this.costScale();
    return scale ? (value / scale) * 100 : 0;
  }

  goTo(path: string): void {
    this.router.navigate([path]);
  }

  onKpiClick(kpi: KpiSummaryItem): void {
    if (kpi.to) this.goTo(kpi.to);
  }

  onKpiKeydown(event: KeyboardEvent, kpi: KpiSummaryItem): void {
    if (!kpi.to) return;
    onActivateKey(event, () => this.goTo(kpi.to!));
  }
}
