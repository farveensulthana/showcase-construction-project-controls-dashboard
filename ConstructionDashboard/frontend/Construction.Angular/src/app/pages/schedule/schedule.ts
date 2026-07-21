import { Component, OnInit, signal, computed } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ProjectsService } from '../../core/services/projects.service';
import { ReportsService } from '../../core/services/reports.service';
import { TasksService } from '../../core/services/tasks.service';
import type { GanttTask, ProjectSummaryDto, UpcomingMilestoneDto } from '../../core/models/api.models';
import { Pagination } from '../../shared/components/pagination/pagination';
import { formatDate } from '../../shared/utils/date.util';

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

function timelineWidth(task: GanttTask, spanMs: number): number {
  if (!spanMs) return 100;
  const widthMs = task.EndDate.getTime() - task.StartDate.getTime();
  return Math.max(2, Math.min(100, (widthMs / spanMs) * 100));
}

function timelineLeft(task: GanttTask, start: Date, spanMs: number): number {
  if (!spanMs) return 0;
  const offset = task.StartDate.getTime() - start.getTime();
  return Math.max(0, Math.min(100, (offset / spanMs) * 100));
}

@Component({
  selector: 'app-schedule',
  imports: [Pagination],
  templateUrl: './schedule.html',
  styleUrl: './schedule.css',
})
export class Schedule implements OnInit {
  readonly shortDate = shortDate;
  readonly formatDate = formatDate;
  readonly pageSize = 20;

  projects = signal<ProjectSummaryDto[]>([]);
  tasks = signal<GanttTask[]>([]);
  milestones = signal<UpcomingMilestoneDto[]>([]);
  projectId = signal<number | 'All'>('All');
  monthOffset = signal(0);
  viewMode = signal<'Month' | 'Week' | 'Day'>('Month');
  page = signal(1);
  loading = signal(true);
  error = signal<string | null>(null);

  milestoneFloatDays = new Map<string, number>();

  projectNameMap = computed(() => {
    const map = new Map<number, string>();
    this.projects().forEach((p) => map.set(p.id, p.name));
    return map;
  });

  filteredTasks = computed(() => {
    const id = this.projectId();
    if (id === 'All') return this.tasks();
    const name = this.projectNameMap().get(id) ?? `Project ${id}`;
    return this.tasks().filter((t) => t.ProjectName === name);
  });

  displayedMonth = computed(() => {
    const base = new Date();
    base.setMonth(base.getMonth() + this.monthOffset());
    base.setDate(1);
    base.setHours(0, 0, 0, 0);
    return base;
  });

  visibleTasks = computed(() => {
    const filtered = this.filteredTasks();
    if (filtered.length === 0) return [];
    const monthStart = new Date(this.displayedMonth());
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59, 999);
    return filtered.filter((t) => t.StartDate <= monthEnd && t.EndDate >= monthStart);
  });

  timelineRange = computed(() => timelineRange(this.filteredTasks()));
  spanMs = computed(() => this.timelineRange().end.getTime() - this.timelineRange().start.getTime());

  allVisibleRows = computed(() => {
    const rows: GanttTask[] = [];
    const visible = this.visibleTasks();
    visible
      .filter((t) => !t.ParentID)
      .sort((a, b) => a.StartDate.getTime() - b.StartDate.getTime())
      .forEach((parent) => {
        rows.push(parent);
        visible
          .filter((t) => t.ParentID === parent.TaskID)
          .sort((a, b) => a.StartDate.getTime() - b.StartDate.getTime())
          .forEach((child) => rows.push(child));
      });
    return rows;
  });

  pagedRows = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.allVisibleRows().slice(start, start + this.pageSize);
  });

  constructor(private projectsApi: ProjectsService, private reports: ReportsService, private tasksApi: TasksService) {}

  ngOnInit(): void {
    forkJoin([
      this.projectsApi.getProjects({ page: 1, pageSize: 100 }),
      this.tasksApi.getTasks({ page: 1, pageSize: 200 }),
      this.reports.getUpcomingMilestones(30, 10),
    ]).subscribe({
      next: ([projectsResp, tasksResp, milestones]) => {
        this.projects.set(projectsResp.data);
        this.tasks.set(tasksResp.data);
        this.milestones.set(milestones);
        // Preserves the original (intentionally not "fixed") behavior: a placeholder
        // random float-days value per milestone row, computed once per load.
        milestones.forEach((m) => this.milestoneFloatDays.set(`${m.projectCode}-${m.title}`, Math.floor(Math.random() * 5)));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err instanceof Error ? err.message : 'Failed to load schedule');
        this.loading.set(false);
      },
    });
  }

  getChildRows(parent: GanttTask): GanttTask[] {
    return this.visibleTasks()
      .filter((t) => t.ParentID === parent.TaskID)
      .sort((a, b) => a.StartDate.getTime() - b.StartDate.getTime());
  }

  isChildRow(task: GanttTask): boolean {
    return !!task.ParentID;
  }

  timelineLeft(task: GanttTask): number {
    return timelineLeft(task, this.timelineRange().start, this.spanMs());
  }

  timelineWidth(task: GanttTask): number {
    return timelineWidth(task, this.spanMs());
  }

  progressWidth(task: GanttTask): number {
    return Math.max(2, this.timelineWidth(task) * (task.Progress / 100));
  }

  getMonthLabel(): string {
    return getMonthLabel(this.displayedMonth());
  }

  milestoneCriticality(m: UpcomingMilestoneDto): { className: string; label: string } {
    const days = this.milestoneFloatDays.get(`${m.projectCode}-${m.title}`) ?? 0;
    if (days === 0) return { className: 'badge-error', label: 'Critical' };
    if (days <= 2) return { className: 'badge-warning', label: 'Near Critical' };
    return { className: 'badge-info', label: 'On Track' };
  }

  milestoneFloat(m: UpcomingMilestoneDto): number {
    return this.milestoneFloatDays.get(`${m.projectCode}-${m.title}`) ?? 0;
  }

  onProjectFilterChange(value: string): void {
    this.projectId.set(value === 'All' ? 'All' : Number(value));
    this.page.set(1);
  }

  prevMonth(): void {
    this.monthOffset.update((m) => m - 1);
    this.page.set(1);
  }

  nextMonth(): void {
    this.monthOffset.update((m) => m + 1);
    this.page.set(1);
  }

  setViewMode(mode: 'Month' | 'Week' | 'Day'): void {
    this.viewMode.set(mode);
    this.page.set(1);
  }
}
