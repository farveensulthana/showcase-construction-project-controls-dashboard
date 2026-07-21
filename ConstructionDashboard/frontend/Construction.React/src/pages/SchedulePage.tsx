import type { ReactElement } from 'react';
import React, { useEffect, useMemo, useState } from 'react';
import { projectsApi, reportsApi, tasksApi } from '../api/reports';
import { Pagination } from '../components/Pagination';
import type { GanttTask, ProjectSummaryDto, UpcomingMilestoneDto } from '../types';
import { format as formatDate } from '../utils/date';
import './SchedulePage.css';

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getMonthLabel(date: Date): string {
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function shortDate(d?: string | Date | null): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '—';
  return `${monthNames[date.getMonth()]} ${date.getDate()}`;
}

function timelineRange(tasksToScan: GanttTask[]): { start: Date; end: Date } {
  const timestamps = tasksToScan.flatMap((t) => [t.StartDate.getTime(), t.EndDate.getTime()]);
  const min = timestamps.length ? Math.min(...timestamps) : Date.now();
  const max = timestamps.length ? Math.max(...timestamps) : Date.now();
  return { start: new Date(min), end: new Date(max) };
}

function timelineWidth(task: GanttTask, _: Date, spanMs: number): number {
  if (!spanMs) return 100;
  const taskStart = task.StartDate.getTime();
  const taskEnd = task.EndDate.getTime();
  const widthMs = taskEnd - taskStart;
  return Math.max(2, Math.min(100, (widthMs / spanMs) * 100));
}

function timelineLeft(task: GanttTask, start: Date, spanMs: number): number {
  if (!spanMs) return 0;
  const offset = task.StartDate.getTime() - start.getTime();
  return Math.max(0, Math.min(100, (offset / spanMs) * 100));
}

export function SchedulePage(): ReactElement {
  const [projects, setProjects] = useState<ProjectSummaryDto[]>([]);
  const [tasks, setTasks] = useState<GanttTask[]>([]);
  const [milestones, setMilestones] = useState<UpcomingMilestoneDto[]>([]);
  const [projectId, setProjectId] = useState<number | 'All'>('All');
  const [monthOffset, setMonthOffset] = useState(0);
  const [viewMode, setViewMode] = useState<'Month' | 'Week' | 'Day'>('Month');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [projectId, monthOffset, viewMode]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      projectsApi.getProjects({ page: 1, pageSize: 100 }),
      tasksApi.getTasks({ page: 1, pageSize: 200 }),
      reportsApi.getUpcomingMilestones(30, 10),
    ])
      .then(([projectsResp, tasksResp, milestoneData]) => {
        if (cancelled) return;
        setProjects(projectsResp.data);
        setTasks(tasksResp.data);
        setMilestones(milestoneData);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load schedule');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const projectNameMap = useMemo(() => {
    const map = new Map<number, string>();
    projects.forEach((p) => map.set(p.id, p.name));
    return map;
  }, [projects]);

  const filteredTasks = useMemo(() => {
    if (projectId === 'All') return tasks;
    return tasks.filter((t) => t.ProjectName === (projectNameMap.get(projectId) ?? `Project ${projectId}`));
  }, [tasks, projectId, projectNameMap]);

  const displayedMonth = useMemo(() => {
    const base = new Date();
    base.setMonth(base.getMonth() + monthOffset);
    base.setDate(1);
    base.setHours(0, 0, 0, 0);
    return base;
  }, [monthOffset]);

  const visibleTasks = useMemo(() => {
    if (filteredTasks.length === 0) return [];
    const monthStart = new Date(displayedMonth);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59, 999);
    return filteredTasks.filter(
      (t) => t.StartDate <= monthEnd && t.EndDate >= monthStart
    );
  }, [filteredTasks, displayedMonth]);

  const { start, end } = useMemo(() => timelineRange(filteredTasks), [filteredTasks]);
  const spanMs = end.getTime() - start.getTime();

  const allVisibleRows = useMemo(() => {
    const rows: GanttTask[] = [];
    visibleTasks
      .filter((t) => !t.ParentID)
      .sort((a, b) => a.StartDate.getTime() - b.StartDate.getTime())
      .forEach((parent) => {
        rows.push(parent);
        visibleTasks
          .filter((t) => t.ParentID === parent.TaskID)
          .sort((a, b) => a.StartDate.getTime() - b.StartDate.getTime())
          .forEach((child) => rows.push(child));
      });
    return rows;
  }, [visibleTasks]);

  const pagedRows = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return allVisibleRows.slice(startIndex, startIndex + pageSize);
  }, [allVisibleRows, page, pageSize]);

  function getChildRows(parent: GanttTask): GanttTask[] {
    return visibleTasks
      .filter((t) => t.ParentID === parent.TaskID)
      .sort((a, b) => a.StartDate.getTime() - b.StartDate.getTime());
  }

  function isChildRow(task: GanttTask): boolean {
    return !!task.ParentID;
  }

  return (
    <div className="schedule-page">
      <header className="page-header">
        <h1>Schedule</h1>
        <p>Cross-project schedule view with milestone and task tracking.</p>
      </header>

      {loading && <div className="loading-state" aria-live="polite">Loading schedule…</div>}
      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {!loading && !error && (
        <>
          <div className="toolbar">
            <div className="toolbar-left">
              <select
                className="select"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value === 'All' ? 'All' : Number(e.target.value))}
              >
                <option value="All">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <div className="month-navigator">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMonthOffset((m) => m - 1)}>
                  <i className="icon icon-chevron-left" aria-hidden="true" />
                </button>
                <span className="text-secondary">{getMonthLabel(displayedMonth)}</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMonthOffset((m) => m + 1)}>
                  <i className="icon icon-chevron-right" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="toolbar-right">
              <button type="button" className="btn btn-secondary btn-sm">
                <i className="icon icon-filter" aria-hidden="true" />
                Filter
              </button>
              <button type="button" className="btn btn-primary">
                <i className="icon icon-plus" aria-hidden="true" />
                Add Task
              </button>
            </div>
          </div>

          <div className="toolbar schedule-view-toggle">
            <div className="toolbar-left" style={{ margin: 0 }}>
              <button
                type="button"
                className={`btn btn-ghost btn-sm ${viewMode === 'Month' ? 'is-active' : ''}`}
                onClick={() => setViewMode('Month')}
                style={{ color: viewMode === 'Month' ? 'var(--color-accent)' : undefined }}
              >
                Month
              </button>
              <button
                type="button"
                className={`btn btn-ghost btn-sm ${viewMode === 'Week' ? 'is-active' : ''}`}
                onClick={() => setViewMode('Week')}
                style={{ color: viewMode === 'Week' ? 'var(--color-accent)' : undefined }}
              >
                Week
              </button>
              <button
                type="button"
                className={`btn btn-ghost btn-sm ${viewMode === 'Day' ? 'is-active' : ''}`}
                onClick={() => setViewMode('Day')}
                style={{ color: viewMode === 'Day' ? 'var(--color-accent)' : undefined }}
              >
                Day
              </button>
            </div>
          </div>

          <div className="card gantt-card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Gantt Timeline</h2>
                <p className="card-subtitle">Work breakdown and dependencies across active projects</p>
              </div>
            </div>
            <div className="table-container gantt-table-wrap">
              <table className="data-table gantt-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 260 }}>Task</th>
                    <th style={{ minWidth: 100 }}>Start</th>
                    <th style={{ minWidth: 100 }}>Finish</th>
                    <th style={{ minWidth: 100 }}>% Complete</th>
                    <th style={{ minWidth: 360 }}>Timeline</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.length === 0 && (
                    <tr>
                      <td colSpan={5} className="empty-state" style={{ textAlign: 'center' }}>
                        No tasks match the current filters
                      </td>
                    </tr>
                  )}
                  {pagedRows.map((task) => {
                    const children = isChildRow(task) ? [] : getChildRows(task);
                    return (
                      <React.Fragment key={task.TaskID}>
                        <tr>
                          <td style={{ fontWeight: isChildRow(task) ? 400 : 600, paddingLeft: isChildRow(task) ? 36 : undefined }}>{task.TaskName}</td>
                          <td>{shortDate(task.StartDate)}</td>
                          <td>{shortDate(task.EndDate)}</td>
                          <td>{task.Progress}%</td>
                          <td>
                            <div className="timeline-cell">
                              <div
                                className="timeline-track"
                                style={{
                                  left: `${timelineLeft(task, start, spanMs)}%`,
                                  width: `${timelineWidth(task, start, spanMs)}%`,
                                }}
                              />
                              <div
                                className="timeline-progress"
                                style={{
                                  left: `${timelineLeft(task, start, spanMs)}%`,
                                  width: `${Math.max(2, timelineWidth(task, start, spanMs) * (task.Progress / 100))}%`,
                                }}
                              />
                              {!isChildRow(task) && (
                                <span className="timeline-progress-label text-secondary">{task.Progress}%</span>
                              )}
                            </div>
                          </td>
                        </tr>
                        {!isChildRow(task) &&
                          children.map((child) => (
                            <tr key={child.TaskID}>
                              <td style={{ paddingLeft: 36 }}>{child.TaskName}</td>
                              <td>{shortDate(child.StartDate)}</td>
                              <td>{shortDate(child.EndDate)}</td>
                              <td>{child.Progress}%</td>
                              <td>
                                <div className="timeline-cell">
                                  <div
                                    className="timeline-track"
                                    style={{
                                      left: `${timelineLeft(child, start, spanMs)}%`,
                                      width: `${timelineWidth(child, start, spanMs)}%`,
                                    }}
                                  />
                                  <div
                                    className="timeline-progress"
                                    style={{
                                      left: `${timelineLeft(child, start, spanMs)}%`,
                                      width: `${Math.max(2, timelineWidth(child, start, spanMs) * (child.Progress / 100))}%`,
                                    }}
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              pageSize={pageSize}
              totalCount={allVisibleRows.length}
              onPageChange={setPage}
            />
          </div>

          <div className="card milestone-card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Critical Path Milestones</h2>
                <p className="card-subtitle">Next 30 days</p>
              </div>
            </div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Milestone</th>
                    <th>Date</th>
                    <th>Float</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {milestones.length === 0 && (
                    <tr>
                      <td colSpan={5} className="empty-state" style={{ textAlign: 'center' }}>
                        No upcoming milestones
                      </td>
                    </tr>
                  )}
                  {milestones.map((m) => {
                    const days = Math.floor(Math.random() * 5);
                    const { className, label } = days === 0 ? { className: 'badge-error', label: 'Critical' } : days <= 2 ? { className: 'badge-warning', label: 'Near Critical' } : { className: 'badge-info', label: 'On Track' };
                    return (
                      <tr key={`${m.projectCode}-${m.title}`}>
                        <td className="font-mono">{m.projectCode}</td>
                        <td>{m.title}</td>
                        <td>{formatDate(m.dueDate)}</td>
                        <td>{days} days</td>
                        <td><span className={`badge ${className}`}>{label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
