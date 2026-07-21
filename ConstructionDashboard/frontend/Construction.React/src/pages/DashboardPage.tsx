import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportsApi } from '../api/reports';
import type { CostKpisDto, CostPerformancePointDto, HealthStatus, PortfolioKpisDto, ProjectHealthDistributionDto, UpcomingMilestoneDto } from '../types';
import { onActivateKey } from '../utils/a11y';
import { format } from '../utils/date';
import { formatCompactCurrency } from '../utils/format';
import './DashboardPage.css';

const healthClasses: Record<HealthStatus, string> = {
  NotStarted: 'text-secondary',
  OnTrack: 'positive',
  AtRisk: 'warning',
  Critical: 'negative',
};

function formatPct(n?: number | null): string {
  if (n === undefined || n === null) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
}

function conicGradient(onTrack: number, atRisk: number, critical: number, notStarted: number, total: number): string {
  if (total === 0) return 'conic-gradient(var(--color-border) 0 100%)';
  const t1 = (onTrack / total) * 100;
  const t2 = t1 + (atRisk / total) * 100;
  const t3 = t2 + (critical / total) * 100;
  void notStarted;
  return `conic-gradient(var(--color-success) 0% ${t1}%, var(--color-warning) ${t1}% ${t2}%, var(--color-error) ${t2}% ${t3}%, var(--color-border) ${t3}% 100%)`;
}

function maxCostTrend(data: CostPerformancePointDto[]): number {
  if (data.length === 0) return 1;
  return Math.max(...data.flatMap((d) => [d.planned, d.actual]), 1);
}

export function DashboardPage(): ReactElement {
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState<PortfolioKpisDto | null>(null);
  const [cost, setCost] = useState<CostKpisDto | null>(null);
  const [health, setHealth] = useState<ProjectHealthDistributionDto | null>(null);
  const [trend, setTrend] = useState<CostPerformancePointDto[]>([]);
  const [milestones, setMilestones] = useState<UpcomingMilestoneDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      reportsApi.getPortfolioKpis(),
      reportsApi.getCostKpis(),
      reportsApi.getProjectHealthDistribution(),
      reportsApi.getCostPerformanceTrend(6),
      reportsApi.getUpcomingMilestones(14, 10),
    ])
      .then(([portfolioData, costData, healthData, trendData, milestoneData]) => {
        if (cancelled) return;
        setPortfolio(portfolioData);
        setCost(costData);
        setHealth(healthData);
        setTrend(trendData);
        setMilestones(milestoneData);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [onTrack, atRisk, critical, notStarted, total] = useMemo(
    () => (health ? [health.onTrack, health.atRisk, health.critical, health.notStarted, health.onTrack + health.atRisk + health.critical + health.notStarted] : [0, 0, 0, 0, 0]),
    [health]
  );

  const costScale = useMemo(() => maxCostTrend(trend), [trend]);

  const kpiSummary = useMemo(() => {
    if (!portfolio || !cost) return null;
    return [
      { label: 'Active Projects', value: portfolio.activeProjects.toString(), icon: 'arrow-up-right', trend: '3 this quarter', tone: 'positive' as const, to: '/projects' },
      { label: 'Schedule Variance (SV)', value: formatPct(portfolio.scheduleVariancePct), icon: portfolio.scheduleVariancePct >= 0 ? 'arrow-up-right' : 'arrow-down-right', trend: `${Math.abs(portfolio.scheduleVariancePct).toFixed(1)}% ${portfolio.scheduleVariancePct >= 0 ? 'ahead' : 'behind'} plan`, tone: portfolio.scheduleVariancePct >= 0 ? 'positive' : 'negative' as const },
      { label: 'Cost Variance (CV)', value: formatPct(portfolio.costVariancePct), icon: portfolio.costVariancePct >= 0 ? 'arrow-up-right' : 'arrow-down-right', trend: portfolio.costVariancePct >= 0 ? 'Under budget' : 'Over budget', tone: portfolio.costVariancePct >= 0 ? 'positive' : 'negative' as const, to: '/cost-control' },
      { label: 'CPI', value: portfolio.cpi.toFixed(2), icon: portfolio.cpi >= 1 ? 'arrow-up-right' : 'alert-circle', trend: portfolio.cpi >= 1 ? 'On target' : 'Below target', tone: portfolio.cpi >= 1 ? 'positive' : 'warning' as const },
      { label: 'SPI', value: portfolio.spi.toFixed(2), icon: portfolio.spi >= 1 ? 'arrow-up-right' : 'arrow-down-right', trend: portfolio.spi >= 1 ? 'Schedule on track' : 'Recovery needed', tone: portfolio.spi >= 1 ? 'positive' : 'negative' as const },
      { label: 'Open Risks', value: portfolio.openRisks.toString(), icon: portfolio.criticalRisks > 0 ? 'alert-triangle' : 'check-circle', trend: `${portfolio.criticalRisks} critical`, tone: portfolio.criticalRisks > 0 ? 'negative' : 'positive' as const, to: '/risks' },
    ];
  }, [portfolio]);

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>Real-time project controls across the construction portfolio.</p>
      </header>

      {loading && <div className="loading-state" aria-live="polite">Loading dashboard…</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {!loading && !error && portfolio && cost && health && (
        <>
          <div className="kpi-grid">
            {kpiSummary?.map((kpi) => (
              <div
                className={`kpi-card${kpi.to ? ' is-clickable' : ''}`}
                key={kpi.label}
                {...(kpi.to
                  ? {
                      role: 'button' as const,
                      tabIndex: 0,
                      'aria-label': `View ${kpi.label}`,
                      onClick: () => navigate(kpi.to!),
                      onKeyDown: onActivateKey(() => navigate(kpi.to!)),
                    }
                  : {})}
              >
                <div className="kpi-label">{kpi.label}</div>
                <div className="kpi-value">{kpi.value}</div>
                <div className={`kpi-change ${kpi.tone}`}>
                  <i className={`icon icon-${kpi.icon}`} aria-hidden="true" />
                  {kpi.trend}
                </div>
              </div>
            ))}
          </div>

          <div className="two-column-grid">
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Cost Performance Trend</h2>
                  <p className="card-subtitle">Earned value vs. actual spend</p>
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/reports')}>
                  View report
                </button>
              </div>
              <div className="bar-chart" role="img" aria-label="Cost performance trend, planned versus actual by month">
                {trend.map((point) => (
                  <div
                    key={point.month}
                    className="bar-group"
                    tabIndex={0}
                    aria-label={`${point.month}: planned ${formatCompactCurrency(point.planned)}, actual ${formatCompactCurrency(point.actual)}`}
                    onMouseEnter={() => setHoveredMonth(point.month)}
                    onMouseLeave={() => setHoveredMonth(null)}
                    onFocus={() => setHoveredMonth(point.month)}
                    onBlur={() => setHoveredMonth(null)}
                  >
                    {hoveredMonth === point.month && (
                      <div className="chart-tooltip" role="tooltip" aria-hidden="true">
                        <div className="chart-tooltip-title">{point.month}</div>
                        <div className="chart-tooltip-row">
                          <span className="chart-tooltip-swatch" style={{ background: 'var(--color-accent)' }} />
                          Planned <strong>{formatCompactCurrency(point.planned)}</strong>
                        </div>
                        <div className="chart-tooltip-row">
                          <span className="chart-tooltip-swatch" style={{ background: 'var(--color-border)' }} />
                          Actual <strong>{formatCompactCurrency(point.actual)}</strong>
                        </div>
                      </div>
                    )}
                    <div className="bar-pair">
                      <div className="bar" style={{ height: `${(point.planned / costScale) * 100}%` }} aria-hidden="true" />
                      <div className="bar is-actual" style={{ height: `${(point.actual / costScale) * 100}%` }} aria-hidden="true" />
                    </div>
                    <span className="bar-label">{point.month}</span>
                  </div>
                ))}
                {trend.length === 0 && (
                  <div className="empty-state" style={{ width: '100%' }}>
                    <i className="icon icon-bar-chart-3" aria-hidden="true" />
                    <p>No trend data available</p>
                  </div>
                )}
              </div>
              <div className="chart-legend">
                <span><span className="legend-swatch" style={{ background: 'var(--color-accent)' }} aria-hidden="true" />Planned</span>
                <span><span className="legend-swatch" style={{ background: 'var(--color-border)' }} aria-hidden="true" />Actual</span>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Projects by Health</h2>
                  <p className="card-subtitle">Risk-weighted health distribution</p>
                </div>
              </div>
              <div className="health-chart" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xl)' }}>
                <div className="donut" style={{ width: 140, height: 140, background: conicGradient(onTrack, atRisk, critical, notStarted, total) }}>
                  <div className="donut-hole">
                    <span>{total}</span>
                    <small>Projects</small>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  <div className={`kpi-change ${healthClasses.OnTrack}`}><span className="status-dot success" aria-hidden="true" /> {onTrack} On track</div>
                  <div className={`kpi-change ${healthClasses.AtRisk}`}><span className="status-dot warning" aria-hidden="true" /> {atRisk} At risk</div>
                  <div className={`kpi-change ${healthClasses.Critical}`}><span className="status-dot error" aria-hidden="true" /> {critical} Critical</div>
                  <div className={`kpi-change ${healthClasses.NotStarted}`}><span className="status-dot" aria-hidden="true" /> {notStarted} Not started</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 'var(--space-xl)' }}>
            <div className="card-header">
              <div>
                <h2 className="card-title">Schedule at a Glance</h2>
                <p className="card-subtitle">Next 14 days across the portfolio</p>
              </div>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Milestone</th>
                    <th>Due Date</th>
                    <th>Owner</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {milestones.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-secondary" style={{ textAlign: 'center' }}>No upcoming milestones</td>
                    </tr>
                  )}
                  {milestones.map((m) => (
                    <tr key={`${m.projectCode}-${m.title}`}>
                      <td className="font-mono">{m.projectCode}</td>
                      <td>{m.title}</td>
                      <td>{format(m.dueDate)}</td>
                      <td>{m.owner ?? '—'}</td>
                      <td>
                        <span className={`badge ${healthBadgeClass[m.healthStatus]}`}>
                          {m.healthStatus.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const healthBadgeClass: Record<HealthStatus, string> = {
  NotStarted: 'badge-neutral',
  OnTrack: 'badge-success',
  AtRisk: 'badge-warning',
  Critical: 'badge-error',
};
