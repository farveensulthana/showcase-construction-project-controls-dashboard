import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { risksApi, riskMatrixApi } from '../api/reports';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import type { RiskKpisDto, RiskMatrixCellViewModel, RiskProbability, RiskSeverity, RiskStatus, RiskSummaryDto } from '../types';
import { onActivateKey } from '../utils/a11y';
import { downloadCsv } from '../utils/csv';
import { format as formatDate } from '../utils/date';
import './RisksPage.css';

interface NewRiskDraft {
  title: string;
  description: string;
  projectId: string;
  projectCode: string;
  severity: RiskSeverity;
  probability: RiskProbability;
  owner: string;
  mitigationPlan: string;
  targetResolutionDate: string;
  impactDays: string;
  impactCost: string;
}

function emptyRiskDraft(): NewRiskDraft {
  return {
    title: '',
    description: '',
    projectId: '',
    projectCode: '',
    severity: 'Medium',
    probability: 'Medium',
    owner: '',
    mitigationPlan: '',
    targetResolutionDate: '',
    impactDays: '',
    impactCost: '',
  };
}

const severityBadgeClass: Record<RiskSeverity, string> = {
  Critical: 'badge-error',
  High: 'badge-warning',
  Medium: 'badge-info',
  Low: 'badge-neutral',
};

const statusBadgeClass: Record<RiskStatus, string> = {
  Open: 'badge-error',
  InProgress: 'badge-warning',
  Monitoring: 'badge-info',
  Escalated: 'badge-error',
  Containment: 'badge-warning',
  Mitigated: 'badge-success',
  Closed: 'badge-neutral',
};

const kpiBorderColor: Record<'critical' | 'high' | 'medium' | 'mitigated', string> = {
  critical: 'var(--color-error)',
  high: 'var(--color-warning)',
  medium: 'var(--color-warning)',
  mitigated: 'var(--color-success)',
};

const kpiIcon: Record<'critical' | 'high' | 'medium' | 'mitigated', string> = {
  critical: 'shield-alert',
  high: 'alert-triangle',
  medium: 'activity',
  mitigated: 'check-circle',
};

const kpiChangeTone: Record<'critical' | 'high' | 'medium' | 'mitigated', string> = {
  critical: 'negative',
  high: 'warning',
  medium: 'text-secondary',
  mitigated: 'positive',
};

const kpiChangeLabel: Record<'critical' | 'high' | 'medium' | 'mitigated', string> = {
  critical: 'Immediate action required',
  high: 'Watch closely',
  medium: 'Monitored',
  mitigated: 'On track',
};

const severityOptions: (RiskSeverity | 'All')[] = ['All', 'Critical', 'High', 'Medium', 'Low'];
const statusOptions: (RiskStatus | 'All')[] = [
  'All',
  'Open',
  'InProgress',
  'Monitoring',
  'Escalated',
  'Containment',
  'Mitigated',
  'Closed',
];

function formatImpact(risk: RiskSummaryDto): string {
  const parts: string[] = [];
  if (risk.impactDays) parts.push(`${risk.impactDays}d`);
  if (risk.impactCost) parts.push(`$${(risk.impactCost / 1_000_000).toFixed(1)}M`);
  if (!parts.length) return 'Minor';
  return parts.join(' · ');
}

function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const severities: RiskSeverity[] = ['Low', 'Medium', 'High', 'Critical'];
const probabilities: RiskProbability[] = ['Low', 'Medium', 'High'];

function ImpactForSeverity(severity: RiskSeverity): string {
  switch (severity) {
    case 'Low':
      return 'Low';
    case 'Medium':
      return 'Medium';
    case 'High':
      return 'High';
    case 'Critical':
      return 'Critical';
    default:
      return severity;
  }
}

function matrixTone(severity: RiskSeverity, probability: RiskProbability): string {
  if (severity === 'Critical' || (severity === 'High' && probability === 'High')) return 'negative';
  if (severity === 'High' || probability === 'High' || (severity === 'Medium' && probability === 'Medium')) return 'warning';
  if (severity === 'Low') return 'positive';
  return 'info';
}

function matrixClass(tone: string): string {
  if (tone === 'negative') return 'is-negative is-emphasis';
  if (tone === 'warning') return 'is-warning';
  if (tone === 'positive') return 'is-positive';
  return 'is-info';
}

export function RisksPage(): ReactElement {
  const navigate = useNavigate();
  const [risks, setRisks] = useState<RiskSummaryDto[]>([]);
  const [kpis, setKpis] = useState<RiskKpisDto | null>(null);
  const [matrix, setMatrix] = useState<RiskMatrixCellViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState<RiskSeverity | 'All'>('All');
  const [status, setStatus] = useState<RiskStatus | 'All'>('All');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const debouncedSearch = useDebouncedValue(search);

  const [selectedRisk, setSelectedRisk] = useState<RiskSummaryDto | null>(null);
  const [showNewRiskModal, setShowNewRiskModal] = useState(false);
  const [newRiskDraft, setNewRiskDraft] = useState<NewRiskDraft>(emptyRiskDraft);

  useEffect(() => {
    let cancelled = false;
    Promise.all([risksApi.getRisks({ page: 1, pageSize: 1000 }), risksApi.getKpis(), riskMatrixApi.getMatrix()])
      .then(([risksResp, kpisData, matrixData]) => {
        if (cancelled) return;
        setRisks(risksResp.data);
        setKpis(kpisData);
        setMatrix(matrixData);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load risks');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, severity, status]);

  const filteredRisks = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return risks.filter((r) => {
      const matchesSearch =
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.number.toLowerCase().includes(q) ||
        r.projectCode.toLowerCase().includes(q);
      const matchesSeverity = severity === 'All' || r.severity === severity;
      const matchesStatus = status === 'All' || r.status === status;
      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [risks, debouncedSearch, severity, status]);

  const pagedRisks = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredRisks.slice(startIndex, startIndex + pageSize);
  }, [filteredRisks, page]);

  const kpiSummary = useMemo(() => {
    if (!kpis) return null;
    return [
      { key: 'critical' as const, label: 'Critical', value: kpis.critical },
      { key: 'high' as const, label: 'High', value: kpis.high },
      { key: 'medium' as const, label: 'Medium', value: kpis.medium },
      { key: 'mitigated' as const, label: 'Mitigated this month', value: kpis.mitigatedThisMonth },
    ];
  }, [kpis]);

  const matrixLookup = useMemo(() => {
    const map = new Map<string, RiskMatrixCellViewModel>();
    matrix.forEach((cell) => map.set(`${cell.probability}-${cell.severity}`, cell));
    return map;
  }, [matrix]);

  function applyKpiFilter(key: 'critical' | 'high' | 'medium' | 'mitigated'): void {
    if (key === 'mitigated') {
      setStatus('Mitigated');
      setSeverity('All');
      return;
    }
    const severityByKpi: Record<'critical' | 'high' | 'medium', RiskSeverity> = {
      critical: 'Critical',
      high: 'High',
      medium: 'Medium',
    };
    setSeverity(severityByKpi[key]);
    setStatus('All');
  }

  function openNewRiskModal(): void {
    setNewRiskDraft(emptyRiskDraft());
    setShowNewRiskModal(true);
  }

  function handleSaveNewRisk(): void {
    if (!newRiskDraft.title.trim()) return;
    const nextId = risks.length ? Math.max(...risks.map((r) => r.id)) + 1 : 1;
    const impactDays = newRiskDraft.impactDays ? Number(newRiskDraft.impactDays) : undefined;
    const impactCost = newRiskDraft.impactCost ? Number(newRiskDraft.impactCost) : undefined;
    const draft: RiskSummaryDto = {
      id: nextId,
      projectId: Number(newRiskDraft.projectId) || 0,
      projectCode: newRiskDraft.projectCode.trim() || 'TBD',
      number: `RISK-${String(nextId).padStart(4, '0')}`,
      title: newRiskDraft.title.trim(),
      description: newRiskDraft.description.trim() || undefined,
      severity: newRiskDraft.severity,
      probability: newRiskDraft.probability,
      impactCost,
      impactDays,
      owner: newRiskDraft.owner.trim() || undefined,
      status: 'Open',
      mitigationPlan: newRiskDraft.mitigationPlan.trim() || undefined,
      identifiedDate: new Date().toISOString(),
      targetResolutionDate: newRiskDraft.targetResolutionDate || undefined,
      impactDisplay: '',
    };
    draft.impactDisplay = formatImpact(draft);
    // Demo only: kept in local component state so it's visible in the UI immediately;
    // nothing is written back to the API.
    setRisks((prev) => [draft, ...prev]);
    setSeverity('All');
    setStatus('All');
    setSearch('');
    setShowNewRiskModal(false);
  }

  function handleExportRisks(): void {
    downloadCsv<RiskSummaryDto>(
      'risks',
      [
        { header: 'ID', value: (r) => r.number },
        { header: 'Risk / Issue', value: (r) => r.title },
        { header: 'Project', value: (r) => r.projectCode },
        { header: 'Severity', value: (r) => r.severity },
        { header: 'Probability', value: (r) => r.probability },
        { header: 'Impact', value: (r) => formatImpact(r) },
        { header: 'Owner', value: (r) => r.owner ?? '' },
        { header: 'Status', value: (r) => r.status },
      ],
      filteredRisks,
    );
  }

  return (
    <div className="risks-page">
      <header className="page-header">
        <h1>Risks &amp; Issues</h1>
        <p>Track, score, and mitigate project risks before they impact cost or schedule.</p>
      </header>

      {loading && <div className="loading-state" aria-live="polite">Loading risks…</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {!loading && !error && (
        <>
          <div className="toolbar">
            <div className="toolbar-left">
              <div className="input-with-icon">
                <i className="icon icon-search" aria-hidden="true" />
                <input
                  type="search"
                  className="input"
                  placeholder="Search risks…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                className="select"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as RiskSeverity | 'All')}
              >
                {severityOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                className="select"
                value={status}
                onChange={(e) => setStatus(e.target.value as RiskStatus | 'All')}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="toolbar-right">
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleExportRisks} disabled={filteredRisks.length === 0}>
                <i className="icon icon-download" aria-hidden="true" />
                Export
              </button>
              <button type="button" className="btn btn-primary" onClick={openNewRiskModal}>
                <i className="icon icon-plus" aria-hidden="true" />
                New Risk
              </button>
            </div>
          </div>

          <div className="kpi-grid" style={{ marginBottom: 'var(--space-xl)' }}>
            {kpiSummary?.map((kpi) => (
              <div
                className="kpi-card is-clickable"
                key={kpi.key}
                style={{ borderLeft: `4px solid ${kpiBorderColor[kpi.key]}` }}
                role="button"
                tabIndex={0}
                aria-label={`Filter risk register by ${kpi.label}`}
                onClick={() => applyKpiFilter(kpi.key)}
                onKeyDown={onActivateKey(() => applyKpiFilter(kpi.key))}
              >
                <div className="kpi-label">{kpi.label}</div>
                <div className={`kpi-value ${kpi.key === 'critical' ? 'text-error' : kpi.key === 'mitigated' ? 'positive' : ''}`}>{kpi.value}</div>
                <div className={`kpi-change ${kpiChangeTone[kpi.key]}`}>
                  <i className={`icon icon-${kpiIcon[kpi.key]}`} aria-hidden="true" />
                  {kpiChangeLabel[kpi.key]}
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Risk Register</h2>
                <p className="card-subtitle">Open items across portfolio</p>
              </div>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Risk / Issue</th>
                    <th>Project</th>
                    <th>Severity</th>
                    <th>Probability</th>
                    <th>Impact</th>
                    <th>Owner</th>
                    <th>Mitigation Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRisks.length === 0 && (
                    <tr>
                      <td colSpan={8} className="empty-state" style={{ textAlign: 'center' }}>
                        No risks match the current filters
                      </td>
                    </tr>
                  )}
                  {pagedRisks.map((r) => (
                    <tr
                      key={r.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedRisk(r)}
                      onKeyDown={onActivateKey(() => setSelectedRisk(r))}
                    >
                      <td className="font-mono">{r.number}</td>
                      <td style={{ fontWeight: 600 }}>{r.title}</td>
                      <td className="truncate" style={{ maxWidth: 180 }}>{r.projectCode}</td>
                      <td><span className={`badge ${severityBadgeClass[r.severity]}`}>{r.severity}</span></td>
                      <td>{r.probability}</td>
                      <td>{formatImpact(r)}</td>
                      <td>{r.owner || '—'}</td>
                      <td><span className={`badge ${statusBadgeClass[r.status]}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              pageSize={pageSize}
              totalCount={filteredRisks.length}
              onPageChange={setPage}
            />
          </div>

          <div className="card risk-matrix-card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Risk Matrix</h2>
                <p className="card-subtitle">Probability × Impact</p>
              </div>
            </div>
            <div className="risk-matrix">
              {probabilities
                .slice()
                .reverse()
                .map((probability) => (
                  <div className="risk-matrix-row" key={probability}>
                    <div className="risk-matrix-label text-secondary">{probability}</div>
                    {severities.map((severity) => {
                      const cell = matrixLookup.get(`${probability}-${severity}`);
                      const tone = matrixTone(severity, probability);
                      const ids = cell?.riskIds.slice(0, 2) ?? [];
                      return (
                        <div className={`risk-matrix-cell ${matrixClass(tone)}`} key={`${probability}-${severity}`}>
                          {ids.length ? ids.join(', ') : ''}
                          {cell && cell.count > ids.length ? ` +${cell.count - ids.length}` : ''}
                        </div>
                      );
                    })}
                  </div>
                ))}
              <div className="risk-matrix-row">
                <div />
                {severities.map((s) => (
                  <div className="risk-matrix-axis text-secondary" key={s}>{ImpactForSeverity(s)}</div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <Modal
        open={!!selectedRisk}
        onClose={() => setSelectedRisk(null)}
        title={selectedRisk ? selectedRisk.title : ''}
        subtitle={selectedRisk ? `${selectedRisk.number} · ${selectedRisk.projectCode}` : undefined}
        size="lg"
        footer={
          selectedRisk && (
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setSelectedRisk(null)}>
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  const projectId = selectedRisk.projectId;
                  setSelectedRisk(null);
                  navigate(`/projects/${projectId}`);
                }}
              >
                <i className="icon icon-external-link" aria-hidden="true" />
                View Project Details
              </button>
            </>
          )
        }
      >
        {selectedRisk && (
          <div className="modal-detail-grid">
            <div className="modal-detail-item">
              <span className="modal-detail-label">Severity</span>
              <span className={`badge ${severityBadgeClass[selectedRisk.severity]}`} style={{ width: 'fit-content' }}>
                {selectedRisk.severity}
              </span>
            </div>
            <div className="modal-detail-item">
              <span className="modal-detail-label">Status</span>
              <span className={`badge ${statusBadgeClass[selectedRisk.status]}`} style={{ width: 'fit-content' }}>
                {selectedRisk.status}
              </span>
            </div>
            <div className="modal-detail-item">
              <span className="modal-detail-label">Probability</span>
              <span className="modal-detail-value">{selectedRisk.probability}</span>
            </div>
            <div className="modal-detail-item">
              <span className="modal-detail-label">Impact</span>
              <span className="modal-detail-value">{formatImpact(selectedRisk)}</span>
            </div>
            <div className="modal-detail-item">
              <span className="modal-detail-label">Owner</span>
              <span className="modal-detail-value">{selectedRisk.owner || '—'}</span>
            </div>
            <div className="modal-detail-item">
              <span className="modal-detail-label">Identified</span>
              <span className="modal-detail-value">{formatDate(selectedRisk.identifiedDate)}</span>
            </div>
            <div className="modal-detail-item">
              <span className="modal-detail-label">Target Resolution</span>
              <span className="modal-detail-value">
                {selectedRisk.targetResolutionDate ? formatDate(selectedRisk.targetResolutionDate) : '—'}
              </span>
            </div>
            <div className="modal-detail-item">
              <span className="modal-detail-label">Closed</span>
              <span className="modal-detail-value">{selectedRisk.closedDate ? formatDate(selectedRisk.closedDate) : '—'}</span>
            </div>
            {selectedRisk.description && (
              <div className="modal-detail-item is-span-2">
                <span className="modal-detail-label">Description</span>
                <span className="modal-detail-value" style={{ fontWeight: 400 }}>{selectedRisk.description}</span>
              </div>
            )}
            {selectedRisk.mitigationPlan && (
              <div className="modal-detail-item is-span-2">
                <span className="modal-detail-label">Mitigation Plan</span>
                <span className="modal-detail-value" style={{ fontWeight: 400 }}>{selectedRisk.mitigationPlan}</span>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={showNewRiskModal}
        onClose={() => setShowNewRiskModal(false)}
        title="New Risk"
        subtitle="Demo template — saved to this view only; nothing is sent to the backend."
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setShowNewRiskModal(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveNewRisk}
              disabled={!newRiskDraft.title.trim()}
            >
              Save Risk
            </button>
          </>
        }
      >
        <div className="modal-form-grid">
          <div className="modal-form-field is-span-2">
            <label htmlFor="risk-title">Title</label>
            <input
              id="risk-title"
              className="input"
              type="text"
              value={newRiskDraft.title}
              onChange={(e) => setNewRiskDraft((d) => ({ ...d, title: e.target.value }))}
              required
            />
          </div>
          <div className="modal-form-field">
            <label htmlFor="risk-project-id">Project ID</label>
            <input
              id="risk-project-id"
              className="input"
              type="number"
              value={newRiskDraft.projectId}
              onChange={(e) => setNewRiskDraft((d) => ({ ...d, projectId: e.target.value }))}
            />
          </div>
          <div className="modal-form-field">
            <label htmlFor="risk-project-code">Project Code</label>
            <input
              id="risk-project-code"
              className="input"
              type="text"
              value={newRiskDraft.projectCode}
              onChange={(e) => setNewRiskDraft((d) => ({ ...d, projectCode: e.target.value }))}
            />
          </div>
          <div className="modal-form-field">
            <label htmlFor="risk-severity">Severity</label>
            <select
              id="risk-severity"
              className="select"
              value={newRiskDraft.severity}
              onChange={(e) => setNewRiskDraft((d) => ({ ...d, severity: e.target.value as RiskSeverity }))}
            >
              {severities.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="modal-form-field">
            <label htmlFor="risk-probability">Probability</label>
            <select
              id="risk-probability"
              className="select"
              value={newRiskDraft.probability}
              onChange={(e) => setNewRiskDraft((d) => ({ ...d, probability: e.target.value as RiskProbability }))}
            >
              {probabilities.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="modal-form-field">
            <label htmlFor="risk-owner">Owner</label>
            <input
              id="risk-owner"
              className="input"
              type="text"
              value={newRiskDraft.owner}
              onChange={(e) => setNewRiskDraft((d) => ({ ...d, owner: e.target.value }))}
            />
          </div>
          <div className="modal-form-field">
            <label htmlFor="risk-target-date">Target Resolution</label>
            <input
              id="risk-target-date"
              className="input"
              type="date"
              value={newRiskDraft.targetResolutionDate}
              onChange={(e) => setNewRiskDraft((d) => ({ ...d, targetResolutionDate: e.target.value }))}
            />
          </div>
          <div className="modal-form-field">
            <label htmlFor="risk-impact-days">Schedule Impact (days)</label>
            <input
              id="risk-impact-days"
              className="input"
              type="number"
              value={newRiskDraft.impactDays}
              onChange={(e) => setNewRiskDraft((d) => ({ ...d, impactDays: e.target.value }))}
            />
          </div>
          <div className="modal-form-field">
            <label htmlFor="risk-impact-cost">Cost Impact ($)</label>
            <input
              id="risk-impact-cost"
              className="input"
              type="number"
              value={newRiskDraft.impactCost}
              onChange={(e) => setNewRiskDraft((d) => ({ ...d, impactCost: e.target.value }))}
            />
          </div>
          <div className="modal-form-field is-span-2">
            <label htmlFor="risk-description">Description</label>
            <textarea
              id="risk-description"
              className="input"
              rows={2}
              value={newRiskDraft.description}
              onChange={(e) => setNewRiskDraft((d) => ({ ...d, description: e.target.value }))}
            />
          </div>
          <div className="modal-form-field is-span-2">
            <label htmlFor="risk-mitigation">Mitigation Plan</label>
            <textarea
              id="risk-mitigation"
              className="input"
              rows={3}
              value={newRiskDraft.mitigationPlan}
              onChange={(e) => setNewRiskDraft((d) => ({ ...d, mitigationPlan: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
