import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  PdfViewerComponent,
  Toolbar,
  Magnification,
  Navigation,
  LinkAnnotation,
  BookmarkView,
  ThumbnailView,
  Print,
  TextSelection,
  TextSearch,
  Inject as PdfViewerInject,
} from '@syncfusion/ej2-react-pdfviewer';
import { onActivateKey } from '../utils/a11y';
import { format } from '../utils/date';
import { formatCurrency } from '../utils/format';
import { projectsApi } from '../api/reports';
import { Modal } from '../components/Modal';
import type {
  ProjectDetailDto,
  ProjectKpisDto,
  RecentDocumentDto,
  RiskSummaryDto,
  ProjectMilestoneDto,
  ChangeOrderSummaryDto,
  RfiSummaryDto,
  SubmittalSummaryDto,
  HealthStatus,
  TaskStatus,
} from '../types';
import './ProjectDetailPage.css';

// Demo documents don't have real per-file content in the sample data set, so every
// preview opens the same sample PDF (mirrors the approach used on the Documents page).
const SAMPLE_PDF_URL = 'https://cdn.syncfusion.com/content/pdf/pdf-succinctly.pdf';

const healthBadgeClass: Record<HealthStatus, string> = {
  NotStarted: 'badge-neutral',
  OnTrack: 'badge-success',
  AtRisk: 'badge-warning',
  Critical: 'badge-error',
};

const riskAlertClass: Record<string, string> = {
  Critical: 'alert-error',
  High: 'alert-warning',
  Medium: 'alert-info',
  Low: 'alert-info',
};

const milestoneStatusBadgeClass: Record<TaskStatus, string> = {
  NotStarted: 'badge-neutral',
  InProgress: 'badge-info',
  OnHold: 'badge-warning',
  Completed: 'badge-success',
  Cancelled: 'badge-error',
};

const milestoneStatusLabel: Record<TaskStatus, string> = {
  NotStarted: 'Not Started',
  InProgress: 'In Progress',
  OnHold: 'On Hold',
  Completed: 'Completed',
  Cancelled: 'Cancelled',
};

interface LoadingErrorStateProps {
  loading: boolean;
  error: string | null;
}
function LoadingErrorState({ loading, error }: LoadingErrorStateProps): ReactElement | null {
  if (error) return <div className="alert alert-error" role="alert">{error}</div>;
  if (loading) return <div className="loading-state" aria-live="polite">Loading project details…</div>;
  return null;
}

type DetailTab = 'Overview' | 'Schedule' | 'Cost' | 'RFIs' | 'Submittals';

function tabBadge(tab: DetailTab, kpis: ProjectKpisDto): number {
  switch (tab) {
    case 'RFIs':
      return kpis.openRfis;
    case 'Submittals':
      return kpis.openSubmittals;
    default:
      return 0;
  }
}

function formatPercent(n: number): string {
  return `${n > 0 ? '+' : ''}${n}%`;
}

export function ProjectDetailPage(): ReactElement {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDetailDto | null>(null);
  const [kpis, setKpis] = useState<ProjectKpisDto | null>(null);
  const [milestones, setMilestones] = useState<ProjectMilestoneDto[]>([]);
  const [risks, setRisks] = useState<RiskSummaryDto[]>([]);
  const [documents, setDocuments] = useState<RecentDocumentDto[]>([]);
  const [rfis, setRfis] = useState<RfiSummaryDto[]>([]);
  const [submittals, setSubmittals] = useState<SubmittalSummaryDto[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrderSummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('Overview');

  const projectId = useMemo(() => Number(id), [id]);

  useEffect(() => {
    if (Number.isNaN(projectId)) {
      setError('Invalid project ID');
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      projectsApi.getById(projectId),
      projectsApi.getKpis(projectId),
      projectsApi.getUpcomingMilestones(projectId, 30, 10),
      projectsApi.getTopRisks(projectId, 5),
      projectsApi.getRecentDocuments(projectId, 30, 10),
      projectsApi.getRfis(projectId, 50),
      projectsApi.getSubmittals(projectId, 50),
      projectsApi.getChangeOrders(projectId, 50),
    ])
      .then(([projectData, kpisData, milestonesData, risksData, documentsData, rfisData, submittalsData, changeOrdersData]) => {
        if (cancelled) return;
        setProject(projectData);
        setKpis(kpisData);
        setMilestones(milestonesData);
        setRisks(risksData);
        setDocuments(documentsData);
        setRfis(rfisData);
        setSubmittals(submittalsData);
        setChangeOrders(changeOrdersData);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load project details');
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const headerSubtitle = useMemo(() => {
    if (!project) return '';
    const parts = [
      project.location,
      project.startDate && project.endDate ? `${format(project.startDate)} – ${format(project.endDate)}` : null,
      project.budget != null ? `${formatCurrency(project.budget)} budget` : null,
    ].filter(Boolean);
    return parts.join(' · ');
  }, [project]);

  const tabs: DetailTab[] = useMemo(() => ['Overview', 'Schedule', 'Cost', 'RFIs', 'Submittals'], []);

  return (
    <div className="project-detail-page">
      <LoadingErrorState loading={loading} error={error} />

      {!loading && !error && project && kpis && (
        <>
          <div className="page-header">
            <div className="breadcrumb">
              <button
                type="button"
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => navigate('/projects')}
                aria-label="Back to projects"
              >
                <i className="icon icon-arrow-left" aria-hidden="true" />
              </button>
              <span>Projects</span>
              <span>/</span>
              <span className="font-mono">{project.code}</span>
            </div>
            <h1>{project.name}</h1>
            <p>{headerSubtitle}</p>
          </div>

          <div className="tabs" role="tablist" aria-label="Project detail tabs">
            {tabs.map((tab) => {
              const badge = tabBadge(tab, kpis);
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  className={`tab${activeTab === tab ? ' is-active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                  {badge > 0 && <span className="badge badge-error" style={{ marginLeft: 8 }}>{badge}</span>}
                </button>
              );
            })}
          </div>

          {activeTab === 'Overview' && (
            <OverviewTab
              project={project}
              kpis={kpis}
              milestones={milestones}
              risks={risks}
              documents={documents}
            />
          )}
          {activeTab === 'Schedule' && <ScheduleTab milestones={milestones} />}
          {activeTab === 'Cost' && <CostTab kpis={kpis} changeOrders={changeOrders} />}
          {activeTab === 'RFIs' && <RfisTab rfis={rfis} />}
          {activeTab === 'Submittals' && <SubmittalsTab submittals={submittals} />}
        </>
      )}
    </div>
  );
}

interface OverviewTabProps {
  project: ProjectDetailDto;
  kpis: ProjectKpisDto;
  milestones: ProjectMilestoneDto[];
  risks: RiskSummaryDto[];
  documents: RecentDocumentDto[];
}

function OverviewTab({ project, kpis, milestones, risks, documents }: OverviewTabProps): ReactElement {
  const navigate = useNavigate();
  const [previewDocument, setPreviewDocument] = useState<RecentDocumentDto | null>(null);
  return (
    <>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Percent Complete</div>
          <div className="kpi-value">{kpis.percentComplete}%</div>
          <div className="progress-bar">
            <div
              className={`progress-fill ${kpis.percentComplete >= 75 ? 'is-success' : kpis.percentComplete >= 40 ? 'is-warning' : 'is-error'}`}
              style={{ width: `${Math.min(100, Math.max(0, kpis.percentComplete))}%` }}
            />
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Cost Variance</div>
          <div className={`kpi-value ${kpis.costVariance >= 0 ? 'text-success' : 'text-error'}`}>
            {kpis.costVariance >= 0 ? '+' : '-'}
            {formatCurrency(Math.abs(kpis.costVariance))}
          </div>
          <div className={`kpi-change ${kpis.costVariance >= 0 ? 'positive' : 'negative'}`}>
            <i className={`icon icon-${kpis.costVariance >= 0 ? 'arrow-up-right' : 'arrow-down-right'}`} aria-hidden="true" />
            {kpis.costVariance >= 0 ? 'Under budget' : 'Over budget'}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Schedule Variance</div>
          <div className={`kpi-value ${kpis.scheduleVariance >= 0 ? 'text-success' : 'text-error'}`}>
            {formatPercent(kpis.scheduleVariance)}
          </div>
          <div className={`kpi-change ${kpis.scheduleVariance >= 0 ? 'positive' : 'negative'}`}>
            <i className={`icon icon-${kpis.scheduleVariance >= 0 ? 'arrow-up-right' : 'arrow-down-right'}`} aria-hidden="true" />
            {kpis.scheduleVariance >= 0 ? 'Ahead of schedule' : 'Behind schedule'}
          </div>
        </div>
        <div
          className="kpi-card is-clickable"
          role="button"
          tabIndex={0}
          onClick={() => navigate('/rfis')}
          onKeyDown={onActivateKey(() => navigate('/rfis'))}
        >
          <div className="kpi-label">Open RFIs</div>
          <div className="kpi-value">{kpis.openRfis}</div>
          <div className={`kpi-change ${kpis.overdueRfis > 0 ? 'warning' : 'positive'}`}>
            <i className={`icon icon-${kpis.overdueRfis > 0 ? 'clock' : 'check-circle'}`} aria-hidden="true" />
            {kpis.overdueRfis > 0 ? `${kpis.overdueRfis} overdue` : 'No overdue'}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Open Submittals</div>
          <div className="kpi-value">{kpis.openSubmittals}</div>
          <div className={`kpi-change ${kpis.overdueSubmittals > 0 ? 'warning' : 'positive'}`}>
            <i className={`icon icon-${kpis.overdueSubmittals > 0 ? 'clock' : 'check-circle'}`} aria-hidden="true" />
            {kpis.overdueSubmittals > 0 ? `${kpis.overdueSubmittals} overdue` : 'On track'}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Pending Change Orders</div>
          <div className="kpi-value">{formatCurrency(kpis.pendingChangeOrdersAmount)}</div>
          <div className={`kpi-change ${kpis.pendingChangeOrdersAmount > 0 ? 'warning' : 'positive'}`}>
            <i className={`icon icon-${kpis.pendingChangeOrdersAmount > 0 ? 'file-plus' : 'check-circle'}`} aria-hidden="true" />
            {kpis.pendingChangeOrdersAmount > 0 ? `${kpis.openChangeOrders} pending review` : 'No pending COs'}
          </div>
        </div>
      </div>

      <div className="panel-grid">
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Upcoming Milestones</h2>
              <p className="card-subtitle">Next 30 days</p>
            </div>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Milestone</th>
                  <th>Planned Date</th>
                  <th>Status</th>
                  <th>Owner</th>
                </tr>
              </thead>
              <tbody>
                {milestones.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-secondary" style={{ textAlign: 'center' }}>No upcoming milestones</td>
                  </tr>
                )}
                {milestones.map((m) => (
                  <tr key={m.id}>
                    <td>{m.title}</td>
                    <td>{format(m.plannedDate)}</td>
                    <td>
                      <span className={`badge ${milestoneStatusBadgeClass[m.status]}`}>
                        {milestoneStatusLabel[m.status]}
                      </span>
                    </td>
                    <td>{m.owner ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Risk Register</h2>
              <p className="card-subtitle">Top open items</p>
            </div>
          </div>
          <div className="card-body">
            {risks.length === 0 && (
              <div className="text-secondary" style={{ textAlign: 'center' }}>No open risks</div>
            )}
            {risks.map((r) => (
              <div key={r.id} className={`alert ${riskAlertClass[r.severity] ?? 'alert-info'}`}>
                <i className={`icon icon-${r.severity === 'Critical' ? 'shield-alert' : 'alert-triangle'}`} aria-hidden="true" />
                <div>
                  <div style={{ fontWeight: 600 }}>{r.title}</div>
                  <div style={{ fontSize: 'var(--text-caption-size)', opacity: 0.9 }}>
                    {r.impactDisplay}
                    {r.owner ? ` · Owner: ${r.owner}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Document Workflow</h2>
            <p className="card-subtitle">Last 30 days · {project.code}</p>
          </div>
          <div className="toolbar-right">
            <button type="button" className="btn btn-ghost btn-sm text-secondary" onClick={() => navigate('/documents')}>
              <i className="icon icon-file-text" aria-hidden="true" /> View documents
            </button>
            <button type="button" className="btn btn-ghost btn-sm text-secondary" onClick={() => navigate('/rfis')}>
              <i className="icon icon-message-square" aria-hidden="true" /> View RFIs
            </button>
          </div>
        </div>
        <div className="table-container document-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Type</th>
                <th>Revision</th>
                <th>Submitted</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-secondary" style={{ textAlign: 'center' }}>No recent documents</td>
                </tr>
              )}
              {documents.map((d) => (
                <tr
                  key={d.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setPreviewDocument(d)}
                  onKeyDown={onActivateKey(() => setPreviewDocument(d))}
                >
                  <td>{d.title}</td>
                  <td>{d.type}</td>
                  <td className="font-mono">{d.revision ?? '—'}</td>
                  <td>{format(d.submittedDate)}</td>
                  <td>
                    <span className={`badge ${documentStatusClass(d.status)}`}>{d.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: 'var(--space-xl)' }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">Project Details</h2>
            <p className="card-subtitle">General information</p>
          </div>
        </div>
        <ul className="meta-list">
          <li>
            <span className="meta-label">Status</span>
            <span className={`badge ${healthBadgeClass[project.healthStatus]}`}>{project.status}</span>
          </li>
          <li>
            <span className="meta-label">Health</span>
            <span className={`badge ${healthBadgeClass[project.healthStatus]}`}>
              {project.healthStatus.replace(/([A-Z])/g, ' $1').trim()}
            </span>
          </li>
          <li>
            <span className="meta-label">Project Manager</span>
            <span className="meta-value">{project.manager ?? '—'}</span>
          </li>
          <li>
            <span className="meta-label">Duration</span>
            <span className="meta-value">{format(project.startDate)} – {format(project.endDate)}</span>
          </li>
          <li>
            <span className="meta-label">Location</span>
            <span className="meta-value">{project.location ?? '—'}</span>
          </li>
          <li>
            <span className="meta-label">Budget</span>
            <span className="meta-value">{formatCurrency(project.budget)}</span>
          </li>
        </ul>
      </div>

      <Modal
        open={!!previewDocument}
        onClose={() => setPreviewDocument(null)}
        title={previewDocument?.title ?? ''}
        subtitle={previewDocument ? `${previewDocument.type} · Rev ${previewDocument.revision ?? '—'} · Submitted ${format(previewDocument.submittedDate)}` : undefined}
        size="xl"
      >
        {previewDocument && (
          <>
            <div className="modal-detail-grid">
              <div className="modal-detail-item">
                <span className="modal-detail-label">Document #</span>
                <span className="modal-detail-value font-mono">{previewDocument.documentNumber}</span>
              </div>
              <div className="modal-detail-item">
                <span className="modal-detail-label">Status</span>
                <span className={`badge ${documentStatusClass(previewDocument.status)}`} style={{ width: 'fit-content' }}>
                  {previewDocument.status}
                </span>
              </div>
            </div>
            <div style={{ height: 620, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              <PdfViewerComponent
                id="project-document-pdf-viewer"
                documentPath={SAMPLE_PDF_URL}
                resourceUrl="/ej2-pdfviewer-lib"
                style={{ height: '620px' }}
              >
                <PdfViewerInject
                  services={[
                    Toolbar,
                    Magnification,
                    Navigation,
                    LinkAnnotation,
                    BookmarkView,
                    ThumbnailView,
                    Print,
                    TextSelection,
                    TextSearch,
                  ]}
                />
              </PdfViewerComponent>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

interface ScheduleTabProps {
  milestones: ProjectMilestoneDto[];
}

function ScheduleTab({ milestones }: ScheduleTabProps): ReactElement {
  return (
    <>
      <h2 className="section-title">Schedule</h2>
      <p className="section-subtitle">Key milestones and planned dates for the project.</p>
      <div className="table-container" style={{ marginTop: 'var(--space-lg)' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Milestone</th>
              <th>Description</th>
              <th>Planned Date</th>
              <th>Status</th>
              <th>Owner</th>
            </tr>
          </thead>
          <tbody>
            {milestones.length === 0 && (
              <tr>
                <td colSpan={5} className="text-secondary" style={{ textAlign: 'center' }}>No milestones</td>
              </tr>
            )}
            {milestones.map((m) => (
              <tr key={m.id}>
                <td style={{ fontWeight: 600 }}>{m.title}</td>
                <td className="text-secondary truncate" style={{ maxWidth: 320 }}>{m.description ?? '—'}</td>
                <td>{format(m.plannedDate)}</td>
                <td>
                  <span className={`badge ${milestoneStatusBadgeClass[m.status]}`}>
                    {milestoneStatusLabel[m.status]}
                  </span>
                </td>
                <td>{m.owner ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CostTab({ kpis, changeOrders }: { kpis: ProjectKpisDto; changeOrders: ChangeOrderSummaryDto[] }): ReactElement {
  return (
    <>
      <h2 className="section-title">Cost Control</h2>
      <p className="section-subtitle">Budget status, cost variance, and pending change orders.</p>
      <div className="kpi-grid" style={{ marginTop: 'var(--space-lg)' }}>
        <div className="kpi-card">
          <div className="kpi-label">Budget</div>
          <div className="kpi-value">{formatCurrency(kpis.budget)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Spent</div>
          <div className="kpi-value">{formatCurrency(kpis.spent)}</div>
          <div className="progress-bar">
            <div
              className={`progress-fill ${kpis.spent / kpis.budget > 0.9 ? 'is-error' : 'is-success'}`}
              style={{ width: `${Math.min(100, Math.round((kpis.spent / kpis.budget) * 100))}%` }}
            />
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Cost Variance</div>
          <div className={`kpi-value ${kpis.costVariance >= 0 ? 'text-success' : 'text-error'}`}>
            {kpis.costVariance >= 0 ? '+' : '-'}
            {formatCurrency(Math.abs(kpis.costVariance))}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Pending Change Orders</div>
          <div className="kpi-value">{formatCurrency(kpis.pendingChangeOrdersAmount)}</div>
          <div className={`kpi-change ${kpis.pendingChangeOrdersAmount > 0 ? 'warning' : 'positive'}`}>
            {kpis.openChangeOrders} open
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">Change Orders</h2>
            <p className="card-subtitle">Pending and approved project changes</p>
          </div>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Number</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Requested By</th>
              </tr>
            </thead>
            <tbody>
              {changeOrders.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-secondary" style={{ textAlign: 'center' }}>No change orders</td>
                </tr>
              )}
              {changeOrders.map((co) => (
                <tr key={co.id}>
                  <td className="font-mono">{co.number}</td>
                  <td>{co.description}</td>
                  <td>{formatCurrency(co.amount)}</td>
                  <td>
                    <span className={`badge ${changeOrderStatusClass(co.status)}`}>{co.status}</span>
                  </td>
                  <td>{co.requestedBy ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function RfisTab({ rfis }: { rfis: RfiSummaryDto[] }): ReactElement {
  const navigate = useNavigate();
  return (
    <>
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">RFI Log</h2>
            <p className="card-subtitle">Discipline, impact, and status</p>
          </div>
          <div className="toolbar-right">
            <button type="button" className="btn btn-ghost btn-sm text-secondary" onClick={() => navigate('/rfis')}>
              <i className="icon icon-message-square" aria-hidden="true" /> View all
            </button>
          </div>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Number</th>
                <th>Subject</th>
                <th>Discipline</th>
                <th>Impact</th>
                <th>Status</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {rfis.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-secondary" style={{ textAlign: 'center' }}>No RFIs</td>
                </tr>
              )}
              {rfis.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono">{r.number}</td>
                  <td>{r.subject}</td>
                  <td>{r.discipline ?? '—'}</td>
                  <td>{r.impact ?? '—'}</td>
                  <td>
                    <span className={`badge ${rfiStatusClass(r.status)}`}>{r.status}</span>
                  </td>
                  <td>{r.dueDate ? format(r.dueDate) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function SubmittalsTab({ submittals }: { submittals: SubmittalSummaryDto[] }): ReactElement {
  return (
    <>
      <h2 className="section-title">Submittals</h2>
      <p className="section-subtitle">Material and shop drawing submittals by specification section.</p>
      <div className="card" style={{ marginTop: 'var(--space-lg)' }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">Submittal Register</h2>
            <p className="card-subtitle">Type, specification section, and approval status</p>
          </div>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Number</th>
                <th>Title</th>
                <th>Type</th>
                <th>Discipline</th>
                <th>Spec Section</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {submittals.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-secondary" style={{ textAlign: 'center' }}>No submittals</td>
                </tr>
              )}
              {submittals.map((s) => (
                <tr key={s.id}>
                  <td className="font-mono">{s.number}</td>
                  <td>{s.title}</td>
                  <td>{s.submittalType ?? '—'}</td>
                  <td>{s.discipline ?? '—'}</td>
                  <td>{s.specificationSection ?? '—'}</td>
                  <td>
                    <span className={`badge ${submittalStatusClass(s.status)}`}>{s.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function documentStatusClass(status: string): string {
  const mapped = status.toLowerCase();
  if (['approved', 'answered', 'uploaded'].includes(mapped)) return 'badge-success';
  if (['under review', 'submitted', 'draft'].includes(mapped)) return 'badge-warning';
  if (['rejected'].includes(mapped)) return 'badge-error';
  return 'badge-info';
}

function changeOrderStatusClass(status: string): string {
  const mapped = status.toLowerCase();
  if (mapped === 'approved') return 'badge-success';
  if (['underreview', 'submitted'].includes(mapped)) return 'badge-warning';
  if (mapped === 'rejected') return 'badge-error';
  return 'badge-info';
}

function rfiStatusClass(status: string): string {
  const mapped = status.toLowerCase();
  if (mapped === 'answered' || mapped === 'closed') return 'badge-success';
  if (mapped === 'open' || mapped === 'overdue') return 'badge-warning';
  if (mapped === 'rejected') return 'badge-error';
  return 'badge-info';
}

function submittalStatusClass(status: string): string {
  const mapped = status.toLowerCase();
  if (['approved', 'accepted'].includes(mapped)) return 'badge-success';
  if (['pending', 'submitted', 'under review'].includes(mapped)) return 'badge-warning';
  if (['rejected', 'revise and resubmit'].includes(mapped)) return 'badge-error';
  return 'badge-info';
}
