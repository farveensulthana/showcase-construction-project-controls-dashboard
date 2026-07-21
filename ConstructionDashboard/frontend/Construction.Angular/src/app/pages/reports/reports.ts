import { Component, OnInit, signal, computed } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ChartAllModule } from '@syncfusion/ej2-angular-charts';
import { ReportsService } from '../../core/services/reports.service';
import type { CostVarianceByCostCodeDto, EarnedValuePointDto } from '../../core/models/api.models';

@Component({
  selector: 'app-reports',
  imports: [ChartAllModule],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class Reports implements OnInit {
  earnedValueTrend = signal<EarnedValuePointDto[]>([]);
  costVariance = signal<CostVarianceByCostCodeDto[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  readonly evPrimaryXAxis = { valueType: 'Category' as const, title: 'Month' };
  readonly evPrimaryYAxis = { title: 'Value ($)', labelFormat: '${value}' };
  readonly cvPrimaryXAxis = { valueType: 'Category' as const, title: 'Cost Code' };
  readonly cvPrimaryYAxis = { title: 'Variance (%)', labelFormat: '{value}%' };
  readonly tooltip = { enable: true };
  readonly legendSettings = { visible: true, position: 'Bottom' as const };

  evData = computed(() => this.earnedValueTrend().map((p) => ({ month: p.month, bcws: p.bcws, bcwp: p.bcwp, acwp: p.acwp })));
  cvData = computed(() => this.costVariance().map((c) => ({ costCode: c.costCode, variance: c.variancePct })));

  constructor(private reports: ReportsService) {}

  ngOnInit(): void {
    forkJoin([this.reports.getEarnedValueTrend(12), this.reports.getCostVarianceByCostCode()]).subscribe({
      next: ([ev, cv]) => {
        this.earnedValueTrend.set(ev);
        this.costVariance.set(cv);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err instanceof Error ? err.message : 'Failed to load reports');
        this.loading.set(false);
      },
    });
  }
}
