import { Component, OnInit, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { ProjectsService } from '../../core/services/projects.service';
import type { ProjectStatus, ProjectSummaryDto } from '../../core/models/api.models';
import { Pagination } from '../../shared/components/pagination/pagination';
import { Modal } from '../../shared/components/modal/modal';
import { onActivateKey } from '../../shared/utils/a11y';
import { downloadCsv } from '../../shared/utils/csv';
import { formatDate } from '../../shared/utils/date.util';
import { formatCurrency } from '../../shared/utils/format.util';

const statusOptions: (ProjectStatus | 'All')[] = ['All', 'Active', 'Planning', 'OnHold', 'Completed', 'Cancelled'];
const newProjectStatusOptions: ProjectStatus[] = ['Planning', 'Active', 'OnHold', 'Completed', 'Cancelled'];

const statusBadgeClass: Record<ProjectStatus, string> = {
  Active: 'badge-success',
  Planning: 'badge-info',
  OnHold: 'badge-warning',
  Completed: 'badge-info',
  Cancelled: 'badge-neutral',
};

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
  return { name: '', code: '', location: '', startDate: today, endDate: today, budget: '', manager: '', status: 'Planning', description: '' };
}

function progressTone(progress: number): string {
  if (progress >= 75) return 'is-success';
  if (progress >= 40) return '';
  return 'is-warning';
}

@Component({
  selector: 'app-projects',
  imports: [Pagination, Modal],
  templateUrl: './projects.html',
  styleUrl: './projects.css',
})
export class Projects implements OnInit {
  readonly statusOptions = statusOptions;
  readonly newProjectStatusOptions = newProjectStatusOptions;
  readonly statusBadgeClass = statusBadgeClass;
  readonly formatDate = formatDate;
  readonly formatCurrency = formatCurrency;
  readonly progressTone = progressTone;
  readonly pageSize = 20;

  projects = signal<ProjectSummaryDto[]>([]);
  status = signal<ProjectStatus | 'All'>('All');
  search = signal('');
  page = signal(1);
  loading = signal(true);
  error = signal<string | null>(null);

  showNewProjectModal = signal(false);
  newProjectDraft = signal<NewProjectDraft>(emptyProjectDraft());

  filteredProjects = computed(() => {
    const q = this.search().trim().toLowerCase();
    const status = this.status();
    return this.projects().filter((p) => {
      const matchesStatus = status === 'All' || p.status === status;
      const matchesSearch =
        !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || (p.location ?? '').toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  });

  pagedProjects = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredProjects().slice(start, start + this.pageSize);
  });

  showingFrom = computed(() => (this.page() - 1) * this.pageSize + 1);
  showingTo = computed(() => Math.min(this.page() * this.pageSize, this.filteredProjects().length));

  constructor(private projectsApi: ProjectsService, private router: Router) {}

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading.set(true);
    this.error.set(null);
    this.projectsApi.getProjects({ page: 1, pageSize: 1000 }).subscribe({
      next: (result) => {
        this.projects.set(result.data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err instanceof Error ? err.message : 'Failed to load projects');
        this.loading.set(false);
      },
    });
  }

  onSearchChange(value: string): void {
    this.search.set(value);
    this.page.set(1);
  }

  onStatusChange(value: ProjectStatus | 'All'): void {
    this.status.set(value);
    this.page.set(1);
  }

  goToProject(id: number): void {
    this.router.navigate(['/projects', id]);
  }

  onRowKeydown(event: KeyboardEvent, id: number): void {
    onActivateKey(event, () => this.goToProject(id));
  }

  openNewProjectModal(): void {
    this.newProjectDraft.set(emptyProjectDraft());
    this.showNewProjectModal.set(true);
  }

  updateDraft(patch: Partial<NewProjectDraft>): void {
    this.newProjectDraft.update((d) => ({ ...d, ...patch }));
  }

  handleSaveNewProject(): void {
    const draft = this.newProjectDraft();
    if (!draft.name.trim()) return;
    const projects = this.projects();
    const nextId = projects.length ? Math.max(...projects.map((p) => p.id)) + 1 : 1;
    const created: ProjectSummaryDto = {
      id: nextId,
      name: draft.name.trim(),
      code: draft.code.trim() || `PRJ-${String(nextId).padStart(4, '0')}`,
      description: draft.description.trim() || undefined,
      startDate: draft.startDate || new Date().toISOString(),
      endDate: draft.endDate || draft.startDate || new Date().toISOString(),
      status: draft.status,
      location: draft.location.trim() || undefined,
      budget: Number(draft.budget) || 0,
      progress: 0,
      manager: draft.manager.trim() || undefined,
      createdDate: new Date().toISOString(),
      healthStatus: 'NotStarted',
    };
    // Demo only: kept in local component state so it's visible in the UI immediately;
    // nothing is written back to the API.
    this.projects.set([created, ...projects]);
    this.status.set('All');
    this.search.set('');
    this.showNewProjectModal.set(false);
  }

  handleExportProjects(): void {
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
      this.filteredProjects(),
    );
  }
}
