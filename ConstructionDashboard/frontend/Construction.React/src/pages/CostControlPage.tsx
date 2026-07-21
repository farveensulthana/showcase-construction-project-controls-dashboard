import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { changeOrdersApi, reportsApi } from '../api/reports';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import type { ChangeOrderSummaryDto, ChangeOrderStatus, CostKpisDto, CostPerformancePointDto, CostVarianceByCostCodeDto } from '../types';
import { onActivateKey } from '../utils/a11y';
import { downloadCsv } from '../utils/csv';
import { format as formatDate } from '../utils/date';
import { formatCompactCurrency, formatCurrency } from '../utils/format';
import './CostControlPage.css';

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
  return {
    projectId: '',
    description: '',
    amount: '',
    requestedBy: '',
    requestDate: new Date().toISOString().slice(0, 10),
    impactDays: '',
    justification: '',
  };
}

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

export function CostControlPage(): ReactElement {
  const [kpis, setKpis] = useState<CostKpisDto | null>(null);
  const [trend, setTrend] = useState<CostPerformancePointDto[]>([]);
  const [variances, setVariances] = useState<CostVarianceByCostCodeDto[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrderSummaryDto[]>([]);
  const [changeOrderPage, setChangeOrderPage] = useState(1);
  const changeOrderPageSize = 20;
  const [coSearch, setCoSearch] = useState('');
  const [coStatus, setCoStatus] = useState<ChangeOrderStatus | 'All'>('UnderReview');
  const [coLoading, setCoLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCo, setSelectedCo] = useState<ChangeOrderSummaryDto | null>(null);
  const [showNewCoModal, setShowNewCoModal] = useState(false);
  const [newCoDraft, setNewCoDraft] = useState<NewChangeOrderDraft>(emptyChangeOrderDraft);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      reportsApi.getCostKpis(),
      reportsApi.getCostPerformanceTrend(7),
      reportsApi.getCostVarianceByCostCode(),
    ])
      .then(([kpisData, trendData, varianceData]) => {
        if (cancelled) return;
        setKpis(kpisData);
        setTrend(trendData);
        setVariances(varianceData.length ? varianceData : FALLBACK_COST_CODES);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load cost control data');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Fetched once and filtered client-side (see filteredChangeOrders) so that
    // locally-added demo change orders aren't wiped out by a status refetch.
    let cancelled = false;
    setCoLoading(true);
    changeOrdersApi
      .getChangeOrders({ page: 1, pageSize: 1000 })
      .then((coData) => {
        if (cancelled) return;
        setChangeOrders(coData.data);
        setCoLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setChangeOrders([]);
        setCoLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setChangeOrderPage(1);
  }, [coStatus, coSearch]);

  const trendScale = useMemo(() => maxTrendValue(trend), [trend]);

  const budgetDelta = useMemo(() => {
    if (!kpis) return null;
    return kpis.totalPortfolioBudget - kpis.forecastAtCompletion;
  }, [kpis]);

  const filteredChangeOrders = useMemo(() => {
    const q = coSearch.trim().toLowerCase();
    return changeOrders.filter((co) => {
      const matchesStatus = coStatus === 'All' || co.status === coStatus;
      const matchesSearch =
        !q ||
        co.number.toLowerCase().includes(q) ||
        co.description.toLowerCase().includes(q) ||
        String(co.projectId).toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [changeOrders, coStatus, coSearch]);

  function openNewChangeOrderModal(): void {
    setNewCoDraft(emptyChangeOrderDraft());
    setShowNewCoModal(true);
  }

  function handleSaveNewChangeOrder(): void {
    if (!newCoDraft.description.trim()) return;
    const nextId = changeOrders.length ? Math.max(...changeOrders.map((co) => co.id)) + 1 : 1;
    const draft: ChangeOrderSummaryDto = {
      id: nextId,
      projectId: Number(newCoDraft.projectId) || 0,
      number: `CO-${String(nextId).padStart(4, '0')}`,
      description: newCoDraft.description.trim(),
      amount: Number(newCoDraft.amount) || 0,
      status: 'Draft',
      requestedBy: newCoDraft.requestedBy.trim() || undefined,
      requestDate: newCoDraft.requestDate || undefined,
      justification: newCoDraft.justification.trim() || undefined,
      impactDays: newCoDraft.impactDays ? Number(newCoDraft.impactDays) : undefined,
      createdDate: new Date().toISOString(),
    };
    // Demo only: kept in local component state so it's visible in the UI immediately;
    // nothing is written back to the API.
    setChangeOrders((prev) => [draft, ...prev]);
    setCoStatus('All');
    setCoSearch('');
    setShowNewCoModal(false);
  }

  function handleExportChangeOrders(): void {
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
      filteredChangeOrders,
    );
  }

  const pagedChangeOrders = useMemo(() => {
    const startIndex = (changeOrderPage - 1) * changeOrderPageSize;
    return filteredChangeOrders.slice(startIndex, startIndex + changeOrderPageSize);
  }, [filteredChangeOrders, changeOrderPage]);

  return (
    <div className="cost-control-page">
      <header className="page-header">
        <h1>Cost Control</h1>
        <p>Track budgets, committed spend, forecasts, and change orders.</p>
      </header>

      {loading && <div className="loading-state" aria-live="polite">Loading cost control…</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {!loading && !error && kpis && (
        <>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-label">Total Portfolio Budget</div>
              <div className="kpi-value">{formatCompactCurrency(kpis.totalPortfolioBudget)}</div>
              <div className="kpi-change text-secondary">
                <i className="icon icon-wallet" aria-hidden="true" />
                24 projects
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Committed Spend</div>
              <div className="kpi-value">{formatCompactCurrency(kpis.committedSpend)}</div>
              <div className="kpi-change text-secondary">
                <i className="icon icon-receipt" aria-hidden="true" />
                {pctOfBudget(kpis.committedSpend, kpis.totalPortfolioBudget)}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Forecast at Completion</div>
              <div className="kpi-value">{formatCompactCurrency(kpis.forecastAtCompletion)}</div>
              <div className={`kpi-change ${(budgetDelta ?? 0) >= 0 ? 'positive' : 'negative'}`}>
                <i className={`icon icon-${(budgetDelta ?? 0) >= 0 ? 'arrow-up-right' : 'arrow-down-right'}`} aria-hidden="true" />
                {formatCompactCurrency(Math.abs(budgetDelta ?? 0))} {(budgetDelta ?? 0) >= 0 ? 'under budget' : 'over budget'}
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Pending Change Orders</div>
              <div className="kpi-value">{formatCompactCurrency(kpis.pendingChangeOrdersAmount)}</div>
              <div className="kpi-change negative">
                <i className="icon icon-file-warning" aria-hidden="true" />
                {kpis.pendingChangeOrdersCount} pending
              </div>
            </div>
          </div>

          <div className="two-column-grid">
            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Earned Value Summary</h2>
                  <p className="card-subtitle">Year to date</p>
                </div>
              </div>
              <div className="bar-chart">
                {trend.map((point) => {
                  const plannedHeight = `${Math.round((point.planned / trendScale) * 100)}%`;
                  const actualHeight = `${Math.round((point.actual / trendScale) * 100)}%`;
                  return (
                    <div className="bar-group" key={point.month}>
                      <div className="bar-pair">
                        <div className="bar" style={{ height: plannedHeight }} />
                        <div className="bar is-actual" style={{ height: actualHeight }} />
                      </div>
                      <span className="bar-label">{point.month}</span>
                    </div>
                  );
                })}
              </div>
              <div className="earned-value-legend">
                <span><span className="legend-swatch" style={{ background: 'var(--color-accent)' }} />BCWS</span>
                <span><span className="legend-swatch" style={{ background: 'var(--color-success)' }} />ACWP</span>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Cost Variance Heatmap</h2>
                  <p className="card-subtitle">By cost code</p>
                </div>
              </div>
              <div className="cost-heatmap">
                {variances.map((v) => (
                  <div className={`cost-heatmap-cell ${heatmapClass(v.variancePct)}`} key={v.costCode}>
                    {v.costCode}
                    <br />
                    <span>{`${v.variancePct >= 0 ? '+' : ''}${v.variancePct}%`}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card change-order-card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Pending Change Orders</h2>
                <p className="card-subtitle">Awaiting owner approval</p>
              </div>
              <button type="button" className="btn btn-primary" onClick={openNewChangeOrderModal}>
                <i className="icon icon-plus" aria-hidden="true" />
                New Change Order
              </button>
            </div>
            <div className="toolbar co-toolbar">
              <div className="toolbar-left">
                <div className="input-with-icon">
                  <i className="icon icon-search" aria-hidden="true" />
                  <input
                    type="search"
                    className="input"
                    placeholder="Search CO #, description, project…"
                    value={coSearch}
                    onChange={(e) => setCoSearch(e.target.value)}
                    style={{ minWidth: 240 }}
                  />
                </div>
                <select
                  className="select"
                  value={coStatus}
                  onChange={(e) => setCoStatus(e.target.value as ChangeOrderStatus | 'All')}
                  style={{ minWidth: 160 }}
                >
                  {coStatusOptions.map((s) => (
                    <option key={s} value={s}>{s === 'All' ? 'All statuses' : statusLabel[s]}</option>
                  ))}
                </select>
              </div>
              <div className="toolbar-right">
                <button type="button" className="btn btn-secondary btn-sm" onClick={handleExportChangeOrders} disabled={filteredChangeOrders.length === 0}>
                  <i className="icon icon-download" aria-hidden="true" />
                  Export
                </button>
              </div>
            </div>
            {coLoading && <div className="loading-state" aria-live="polite">Loading change orders…</div>}
            {!coLoading && (
              <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>CO #</th>
                    <th>Project ID</th>
                    <th>Description</th>
                    <th>Submitted</th>
                    <th>Amount</th>
                    <th>Schedule Impact</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedChangeOrders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="empty-state" style={{ textAlign: 'center' }}>
                        No pending change orders
                      </td>
                    </tr>
                  )}
                  {pagedChangeOrders.map((co) => (
                    <tr
                      key={co.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedCo(co)}
                      onKeyDown={onActivateKey(() => setSelectedCo(co))}
                    >
                      <td className="font-mono">{co.number}</td>
                      <td className="truncate" style={{ maxWidth: 180 }}>{co.projectId}</td>
                      <td className="truncate" style={{ maxWidth: 260 }}>{co.description}</td>
                      <td>{co.requestDate ? formatDate(co.requestDate) : '—'}</td>
                      <td style={{ fontWeight: 600 }}>{`${co.amount >= 0 ? '+' : ''}${formatCurrency(co.amount)}`}</td>
                      <td>{co.impactDays ? `+${co.impactDays} days` : '—'}</td>
                      <td><span className={`badge ${statusBadgeClass[co.status]}`}>{statusLabel[co.status]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredChangeOrders.length > changeOrderPageSize && (
              <Pagination
                page={changeOrderPage}
                pageSize={changeOrderPageSize}
                totalCount={filteredChangeOrders.length}
                onPageChange={setChangeOrderPage}
              />
            )}
              </>
            )}
          </div>
        </>
      )}

      <Modal
        open={!!selectedCo}
        onClose={() => setSelectedCo(null)}
        title={selectedCo ? `Change Order ${selectedCo.number}` : ''}
        subtitle={selectedCo ? `Project ${selectedCo.projectId}` : undefined}
        size="lg"
      >
        {selectedCo && (
          <div className="modal-detail-grid">
            <div className="modal-detail-item">
              <span className="modal-detail-label">Status</span>
              <span className={`badge ${statusBadgeClass[selectedCo.status]}`} style={{ width: 'fit-content' }}>
                {statusLabel[selectedCo.status]}
              </span>
            </div>
            <div className="modal-detail-item">
              <span className="modal-detail-label">Amount</span>
              <span className="modal-detail-value">{`${selectedCo.amount >= 0 ? '+' : ''}${formatCurrency(selectedCo.amount)}`}</span>
            </div>
            <div className="modal-detail-item">
              <span className="modal-detail-label">Requested By</span>
              <span className="modal-detail-value">{selectedCo.requestedBy ?? '—'}</span>
            </div>
            <div className="modal-detail-item">
              <span className="modal-detail-label">Request Date</span>
              <span className="modal-detail-value">{selectedCo.requestDate ? formatDate(selectedCo.requestDate) : '—'}</span>
            </div>
            <div className="modal-detail-item">
              <span className="modal-detail-label">Schedule Impact</span>
              <span className="modal-detail-value">{selectedCo.impactDays ? `+${selectedCo.impactDays} days` : 'None'}</span>
            </div>
            <div className="modal-detail-item">
              <span className="modal-detail-label">Approved By</span>
              <span className="modal-detail-value">{selectedCo.approvedBy ?? '—'}</span>
            </div>
            <div className="modal-detail-item is-span-2">
              <span className="modal-detail-label">Description</span>
              <span className="modal-detail-value" style={{ fontWeight: 400 }}>{selectedCo.description}</span>
            </div>
            {selectedCo.justification && (
              <div className="modal-detail-item is-span-2">
                <span className="modal-detail-label">Justification</span>
                <span className="modal-detail-value" style={{ fontWeight: 400 }}>{selectedCo.justification}</span>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={showNewCoModal}
        onClose={() => setShowNewCoModal(false)}
        title="New Change Order"
        subtitle="Demo template — saved to this view only; nothing is sent to the backend."
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setShowNewCoModal(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveNewChangeOrder}
              disabled={!newCoDraft.description.trim()}
            >
              Save Change Order
            </button>
          </>
        }
      >
        <div className="modal-form-grid">
          <div className="modal-form-field">
            <label htmlFor="co-project">Project ID</label>
            <input
              id="co-project"
              className="input"
              type="number"
              value={newCoDraft.projectId}
              onChange={(e) => setNewCoDraft((d) => ({ ...d, projectId: e.target.value }))}
            />
          </div>
          <div className="modal-form-field">
            <label htmlFor="co-amount">Amount ($)</label>
            <input
              id="co-amount"
              className="input"
              type="number"
              value={newCoDraft.amount}
              onChange={(e) => setNewCoDraft((d) => ({ ...d, amount: e.target.value }))}
            />
          </div>
          <div className="modal-form-field">
            <label htmlFor="co-requestedBy">Requested By</label>
            <input
              id="co-requestedBy"
              className="input"
              type="text"
              value={newCoDraft.requestedBy}
              onChange={(e) => setNewCoDraft((d) => ({ ...d, requestedBy: e.target.value }))}
            />
          </div>
          <div className="modal-form-field">
            <label htmlFor="co-requestDate">Request Date</label>
            <input
              id="co-requestDate"
              className="input"
              type="date"
              value={newCoDraft.requestDate}
              onChange={(e) => setNewCoDraft((d) => ({ ...d, requestDate: e.target.value }))}
            />
          </div>
          <div className="modal-form-field">
            <label htmlFor="co-impactDays">Schedule Impact (days)</label>
            <input
              id="co-impactDays"
              className="input"
              type="number"
              value={newCoDraft.impactDays}
              onChange={(e) => setNewCoDraft((d) => ({ ...d, impactDays: e.target.value }))}
            />
          </div>
          <div className="modal-form-field is-span-2">
            <label htmlFor="co-description">Description</label>
            <textarea
              id="co-description"
              className="input"
              rows={2}
              value={newCoDraft.description}
              onChange={(e) => setNewCoDraft((d) => ({ ...d, description: e.target.value }))}
              required
            />
          </div>
          <div className="modal-form-field is-span-2">
            <label htmlFor="co-justification">Justification</label>
            <textarea
              id="co-justification"
              className="input"
              rows={3}
              value={newCoDraft.justification}
              onChange={(e) => setNewCoDraft((d) => ({ ...d, justification: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
