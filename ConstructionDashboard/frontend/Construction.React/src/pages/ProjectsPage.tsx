import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsApi } from '../api/reports';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import type { ProjectSummaryDto, ProjectStatus } from '../types';
import { onActivateKey } from '../utils/a11y';
import { downloadCsv } from '../utils/csv';
import { format as formatDate } from '../utils/date';
import { formatCurrency } from '../utils/format';
import './ProjectsPage.css';

const statusOptions: (ProjectStatus | 'All')[] = ['All', 'Active', 'Planning', 'OnHold', 'Completed', 'Cancelled'];
const newProjectStatusOptions: ProjectStatus[] = ['Planning', 'Active', 'OnHold', 'Completed', 'Cancelled'];

interface NewProjectDraft {
  name: string;
  code: string;
  location: string;
  startDate: string;
  endDate: string;
  budget: string;
  manager: string;
  status: ProjectStatus;
  description: string;
}

function emptyProjectDraft(): NewProjectDraft {
  const today = new Date().toISOString().slice(0, 10);
  return {
    name: '',
    code: '',
    location: '',
    startDate: today,
    endDate: today,
    budget: '',
    manager: '',
    status: 'Planning',
    description: '',
  };
}

const statusBadgeClass: Record<ProjectStatus, string> = {
  Active: 'badge-success',
  Planning: 'badge-info',
  OnHold: 'badge-warning',
  Completed: 'badge-info',
  Cancelled: 'badge-neutral',
};

function ProgressBar({ value }: { value: number }): ReactElement {
  // ProjectSummaryDto.progress is stored as 0–100 percent, not a 0–1 ratio.
  const progress = Math.max(0, Math.min(100, Math.round(value)));
  const tone = progress >= 75 ? 'is-success' : progress >= 40 ? '' : 'is-warning';
  return (
    <div style={{ minWidth: 120 }}>
      <div className="progress-bar" style={{ maxWidth: 120 }}>
        <div className={`progress-fill ${tone}`} style={{ width: `${progress}%` }} />
      </div>
      <span className="text-secondary" style={{ fontSize: 'var(--text-caption-size)' }}>{progress}%</span>
    </div>
  );
}

function StatusBadge({ status }: { status: ProjectStatus }): ReactElement {
  return <span className={`badge ${statusBadgeClass[status]}`}>{status}</span>;
}

export function ProjectsPage(): ReactElement {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectSummaryDto[]>([]);
  const [status, setStatus] = useState<ProjectStatus | 'All'>('All');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageSize = 20;
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectDraft, setNewProjectDraft] = useState<NewProjectDraft>(emptyProjectDraft);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    projectsApi.getProjects({ page: 1, pageSize: 1000 })
      .then((result) => {
        if (cancelled) return;
        setProjects(result.data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load projects');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [status, search]);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      const matchesStatus = status === 'All' || p.status === status;
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.location ?? '').toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [projects, status, search]);

  const pagedProjects = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredProjects.slice(startIndex, startIndex + pageSize);
  }, [filteredProjects, page]);

  function openNewProjectModal(): void {
    setNewProjectDraft(emptyProjectDraft());
    setShowNewProjectModal(true);
  }

  function handleSaveNewProject(): void {
    if (!newProjectDraft.name.trim()) return;
    const nextId = projects.length ? Math.max(...projects.map((p) => p.id)) + 1 : 1;
    const draft: ProjectSummaryDto = {
      id: nextId,
      name: newProjectDraft.name.trim(),
      code: newProjectDraft.code.trim() || `PRJ-${String(nextId).padStart(4, '0')}`,
      description: newProjectDraft.description.trim() || undefined,
      startDate: newProjectDraft.startDate || new Date().toISOString(),
      endDate: newProjectDraft.endDate || newProjectDraft.startDate || new Date().toISOString(),
      status: newProjectDraft.status,
      location: newProjectDraft.location.trim() || undefined,
      budget: Number(newProjectDraft.budget) || 0,
      progress: 0,
      manager: newProjectDraft.manager.trim() || undefined,
      createdDate: new Date().toISOString(),
      healthStatus: 'NotStarted',
    };
    // Demo only: kept in local component state so it's visible in the UI immediately;
    // nothing is written back to the API.
    setProjects((prev) => [draft, ...prev]);
    setStatus('All');
    setSearch('');
    setShowNewProjectModal(false);
  }

  function handleExportProjects(): void {
    downloadCsv<ProjectSummaryDto>(
      'projects',
      [
        { header: 'Project ID', value: (p) => p.code },
        { header: 'Name', value: (p) => p.name },
        { header: 'Location', value: (p) => p.location ?? '' },
        { header: 'Start Date', value: (p) => formatDate(p.startDate) },
        { header: 'Finish Date', value: (p) => formatDate(p.endDate) },
        { header: 'Progress (%)', value: (p) => Math.round(p.progress) },
        { header: 'Budget', value: (p) => p.budget },
        { header: 'Status', value: (p) => p.status },
      ],
      filteredProjects,
    );
  }

  return (
    <div className="projects-page">
      <header className="page-header">
        <h1>Projects</h1>
        <p>Portfolio overview of all active and planned construction projects.</p>
      </header>

      <div className="toolbar">
        <div className="toolbar-left">
          <div className="input-with-icon">
            <i className="icon icon-search" aria-hidden="true" />
            <input
              type="search"
              className="input"
              placeholder="Search projects…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 240 }}
            />
          </div>
          <select
            className="select"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus | 'All')}
            style={{ minWidth: 160 }}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s === 'All' ? 'All statuses' : s}</option>
            ))}
          </select>
        </div>
        <div className="toolbar-right">
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleExportProjects} disabled={filteredProjects.length === 0}>
            <i className="icon icon-download" aria-hidden="true" />
            Export
          </button>
          <button type="button" className="btn btn-primary" onClick={openNewProjectModal}>
            <i className="icon icon-plus" aria-hidden="true" />
            New Project
          </button>
        </div>
      </div>

      {loading && <div className="loading-state">Loading projects…</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {!loading && !error && (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Project ID</th>
                  <th>Name</th>
                  <th>Location</th>
                  <th>Start Date</th>
                  <th>Finish Date</th>
                  <th>Progress</th>
                  <th>Budget</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pagedProjects.length === 0 && (
                  <tr>
                    <td colSpan={9} className="empty-state" style={{ textAlign: 'center' }}>
                      No projects match the current filters
                    </td>
                  </tr>
                )}
                {pagedProjects.map((p) => (
                  <tr
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/projects/${p.id}`)}
                    onKeyDown={onActivateKey(() => navigate(`/projects/${p.id}`))}
                  >
                    <td className="font-mono">{p.code}</td>
                    <td className="truncate" style={{ maxWidth: 220 }}>{p.name}</td>
                    <td>{p.location ?? '—'}</td>
                    <td>{formatDate(p.startDate)}</td>
                    <td>{formatDate(p.endDate)}</td>
                    <td><ProgressBar value={p.progress} /></td>
                    <td>{formatCurrency(p.budget)}</td>
                    <td><StatusBadge status={p.status} /></td>
                    <td>
                      <button type="button" className="btn btn-ghost btn-icon btn-sm" tabIndex={-1} aria-hidden="true">
                        <i className="icon icon-chevron-right" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="projects-footer">
            <span className="showing-text">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredProjects.length)} of {filteredProjects.length} projects
            </span>
            <Pagination
              page={page}
              pageSize={pageSize}
              totalCount={filteredProjects.length}
              onPageChange={setPage}
            />
          </div>
        </>
      )}

      <Modal
        open={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        title="New Project"
        subtitle="Demo template — saved to this view only; nothing is sent to the backend."
        size="lg"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setShowNewProjectModal(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSaveNewProject}
              disabled={!newProjectDraft.name.trim()}
            >
              Save Project
            </button>
          </>
        }
      >
        <div className="modal-form-grid">
          <div className="modal-form-field is-span-2">
            <label htmlFor="proj-name">Project Name</label>
            <input
              id="proj-name"
              className="input"
              type="text"
              value={newProjectDraft.name}
              onChange={(e) => setNewProjectDraft((d) => ({ ...d, name: e.target.value }))}
              required
            />
          </div>
          <div className="modal-form-field">
            <label htmlFor="proj-code">Project Code</label>
            <input
              id="proj-code"
              className="input"
              type="text"
              value={newProjectDraft.code}
              onChange={(e) => setNewProjectDraft((d) => ({ ...d, code: e.target.value }))}
            />
          </div>
          <div className="modal-form-field">
            <label htmlFor="proj-status">Status</label>
            <select
              id="proj-status"
              className="select"
              value={newProjectDraft.status}
              onChange={(e) => setNewProjectDraft((d) => ({ ...d, status: e.target.value as ProjectStatus }))}
            >
              {newProjectStatusOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="modal-form-field">
            <label htmlFor="proj-location">Location</label>
            <input
              id="proj-location"
              className="input"
              type="text"
              value={newProjectDraft.location}
              onChange={(e) => setNewProjectDraft((d) => ({ ...d, location: e.target.value }))}
            />
          </div>
          <div className="modal-form-field">
            <label htmlFor="proj-manager">Project Manager</label>
            <input
              id="proj-manager"
              className="input"
              type="text"
              value={newProjectDraft.manager}
              onChange={(e) => setNewProjectDraft((d) => ({ ...d, manager: e.target.value }))}
            />
          </div>
          <div className="modal-form-field">
            <label htmlFor="proj-start">Start Date</label>
            <input
              id="proj-start"
              className="input"
              type="date"
              value={newProjectDraft.startDate}
              onChange={(e) => setNewProjectDraft((d) => ({ ...d, startDate: e.target.value }))}
            />
          </div>
          <div className="modal-form-field">
            <label htmlFor="proj-end">Finish Date</label>
            <input
              id="proj-end"
              className="input"
              type="date"
              value={newProjectDraft.endDate}
              onChange={(e) => setNewProjectDraft((d) => ({ ...d, endDate: e.target.value }))}
            />
          </div>
          <div className="modal-form-field">
            <label htmlFor="proj-budget">Budget ($)</label>
            <input
              id="proj-budget"
              className="input"
              type="number"
              value={newProjectDraft.budget}
              onChange={(e) => setNewProjectDraft((d) => ({ ...d, budget: e.target.value }))}
            />
          </div>
          <div className="modal-form-field is-span-2">
            <label htmlFor="proj-description">Description</label>
            <textarea
              id="proj-description"
              className="input"
              rows={3}
              value={newProjectDraft.description}
              onChange={(e) => setNewProjectDraft((d) => ({ ...d, description: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
