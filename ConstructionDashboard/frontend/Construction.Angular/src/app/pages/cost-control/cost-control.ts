import { Component, OnInit, signal, computed } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ReportsService } from '../../core/services/reports.service';
import { ChangeOrdersService } from '../../core/services/change-orders.service';
import type { ChangeOrderStatus, ChangeOrderSummaryDto, CostKpisDto, CostPerformancePointDto, CostVarianceByCostCodeDto } from '../../core/models/api.models';
import { Pagination } from '../../shared/components/pagination/pagination';
import { Modal } from '../../shared/components/modal/modal';
import { onActivateKey } from '../../shared/utils/a11y';
import { downloadCsv } from '../../shared/utils/csv';
import { formatDate } from '../../shared/utils/date.util';
import { formatCompactCurrency, formatCurrency } from '../../shared/utils/format.util';

const FALLBACK_COST_CODES: CostVarianceByCostCodeDto[] = [
  { costCode: 'General Conditions', variancePct: 2 },
  { costCode: 'Sitework', variancePct: 4 },
  { costCode: 'Concrete', variancePct: -3 },
  { costCode: 'Masonry', variancePct: -5 },
  { costCode: 'Metals', variancePct: -8 },
  { costCode: 'Finishes', variancePct: 1 },
];

const statusBadgeClass: Record<ChangeOrderStatus, string> = {
  Draft: 'badge-neutral',
  Submitted: 'badge-info',
  UnderReview: 'badge-warning',
  Approved: 'badge-success',
  Rejected: 'badge-error',
};

const statusLabel: Record<ChangeOrderStatus, string> = {
  Draft: 'Draft',
  Submitted: 'Submitted',
  UnderReview: 'Review',
  Approved: 'Approved',
  Rejected: 'Rejected',
};

const coStatusOptions: (ChangeOrderStatus | 'All')[] = ['All', 'Draft', 'Submitted', 'UnderReview', 'Approved', 'Rejected'];

interface NewChangeOrderDraft {
  projectId: string;
  description: string;
  amount: string;
  requestedBy: string;
  requestDate: string;
  impactDays: string;
  justification: string;
}

function emptyChangeOrderDraft(): NewChangeOrderDraft {
  return { projectId: '', description: '', amount: '', requestedBy: '', requestDate: new Date().toISOString().slice(0, 10), impactDays: '', justification: '' };
}

function heatmapClass(variancePct: number): string {
  if (variancePct >= 0) return 'is-positive';
  if (variancePct >= -5) return 'is-warning';
  return 'is-negative';
}

function pctOfBudget(spend: number, budget: number): string {
  if (!budget) return '—';
  return `${Math.round((spend / budget) * 100)}% of budget`;
}

function maxTrendValue(data: CostPerformancePointDto[]): number {
  if (data.length === 0) return 1;
  return Math.max(...data.flatMap((d) => [d.planned, d.actual]), 1);
}

@Component({
  selector: 'app-cost-control',
  imports: [Pagination, Modal],
  templateUrl: './cost-control.html',
  styleUrl: './cost-control.css',
})
export class CostControl implements OnInit {
  readonly statusBadgeClass = statusBadgeClass;
  readonly statusLabel = statusLabel;
  readonly coStatusOptions = coStatusOptions;
  readonly heatmapClass = heatmapClass;
  readonly formatDate = formatDate;
  readonly formatCurrency = formatCurrency;
  readonly formatCompactCurrency = formatCompactCurrency;
  readonly changeOrderPageSize = 20;

  kpis = signal<CostKpisDto | null>(null);
  trend = signal<CostPerformancePointDto[]>([]);
  variances = signal<CostVarianceByCostCodeDto[]>([]);
  changeOrders = signal<ChangeOrderSummaryDto[]>([]);
  changeOrderPage = signal(1);
  coSearch = signal('');
  coStatus = signal<ChangeOrderStatus | 'All'>('UnderReview');
  coLoading = signal(false);
  loading = signal(true);
  error = signal<string | null>(null);
  selectedCo = signal<ChangeOrderSummaryDto | null>(null);
  showNewCoModal = signal(false);
  newCoDraft = signal<NewChangeOrderDraft>(emptyChangeOrderDraft());
  hoveredMonth = signal<string | null>(null);

  trendScale = computed(() => maxTrendValue(this.trend()));

  budgetDelta = computed(() => {
    const kpis = this.kpis();
    return kpis ? kpis.totalPortfolioBudget - kpis.forecastAtCompletion : null;
  });

  filteredChangeOrders = computed(() => {
    const q = this.coSearch().trim().toLowerCase();
    const status = this.coStatus();
    return this.changeOrders().filter((co) => {
      const matchesStatus = status === 'All' || co.status === status;
      const matchesSearch = !q || co.number.toLowerCase().includes(q) || co.description.toLowerCase().includes(q) || String(co.projectId).toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  });

  pagedChangeOrders = computed(() => {
    const start = (this.changeOrderPage() - 1) * this.changeOrderPageSize;
    return this.filteredChangeOrders().slice(start, start + this.changeOrderPageSize);
  });

  constructor(private reports: ReportsService, private changeOrdersApi: ChangeOrdersService) {}

  ngOnInit(): void {
    forkJoin([this.reports.getCostKpis(), this.reports.getCostPerformanceTrend(7), this.reports.getCostVarianceByCostCode()]).subscribe({
      next: ([kpis, trend, variances]) => {
        this.kpis.set(kpis);
        this.trend.set(trend);
        this.variances.set(variances.length ? variances : FALLBACK_COST_CODES);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err instanceof Error ? err.message : 'Failed to load cost control data');
        this.loading.set(false);
      },
    });

    this.coLoading.set(true);
    this.changeOrdersApi.getChangeOrders({ page: 1, pageSize: 1000 }).subscribe({
      next: (result) => {
        this.changeOrders.set(result.data);
        this.coLoading.set(false);
      },
      error: () => {
        this.changeOrders.set([]);
        this.coLoading.set(false);
      },
    });
  }

  pctOfBudget(spend: number, budget: number): string {
    return pctOfBudget(spend, budget);
  }

  barHeight(value: number): number {
    const scale = this.trendScale();
    return scale ? Math.round((value / scale) * 100) : 0;
  }

  onSearchChange(value: string): void {
    this.coSearch.set(value);
    this.changeOrderPage.set(1);
  }

  onStatusChange(value: ChangeOrderStatus | 'All'): void {
    this.coStatus.set(value);
    this.changeOrderPage.set(1);
  }

  openNewChangeOrderModal(): void {
    this.newCoDraft.set(emptyChangeOrderDraft());
    this.showNewCoModal.set(true);
  }

  updateDraft(patch: Partial<NewChangeOrderDraft>): void {
    this.newCoDraft.update((d) => ({ ...d, ...patch }));
  }

  handleSaveNewChangeOrder(): void {
    const draft = this.newCoDraft();
    if (!draft.description.trim()) return;
    const changeOrders = this.changeOrders();
    const nextId = changeOrders.length ? Math.max(...changeOrders.map((co) => co.id)) + 1 : 1;
    const created: ChangeOrderSummaryDto = {
      id: nextId,
      projectId: Number(draft.projectId) || 0,
      number: `CO-${String(nextId).padStart(4, '0')}`,
      description: draft.description.trim(),
      amount: Number(draft.amount) || 0,
      status: 'Draft',
      requestedBy: draft.requestedBy.trim() || undefined,
      requestDate: draft.requestDate || undefined,
      justification: draft.justification.trim() || undefined,
      impactDays: draft.impactDays ? Number(draft.impactDays) : undefined,
      createdDate: new Date().toISOString(),
    };
    // Demo only: kept in local component state so it's visible in the UI immediately;
    // nothing is written back to the API.
    this.changeOrders.set([created, ...changeOrders]);
    this.coStatus.set('All');
    this.coSearch.set('');
    this.showNewCoModal.set(false);
  }

  handleExportChangeOrders(): void {
    downloadCsv<ChangeOrderSummaryDto>(
      'change-orders',
      [
        { header: 'CO #', value: (co) => co.number },
        { header: 'Project ID', value: (co) => co.projectId },
        { header: 'Description', value: (co) => co.description },
        { header: 'Submitted', value: (co) => (co.requestDate ? formatDate(co.requestDate) : '') },
        { header: 'Amount', value: (co) => co.amount },
        { header: 'Schedule Impact (days)', value: (co) => co.impactDays ?? '' },
        { header: 'Status', value: (co) => statusLabel[co.status] },
      ],
      this.filteredChangeOrders(),
    );
  }

  onRowKeydown(event: KeyboardEvent, co: ChangeOrderSummaryDto): void {
    onActivateKey(event, () => this.selectedCo.set(co));
  }
}
