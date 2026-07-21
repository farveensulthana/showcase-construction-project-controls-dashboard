export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  priority: 'P0' | 'P1' | 'P2';
}

export const primaryNav: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/', icon: 'layout-dashboard', priority: 'P0' },
  { id: 'projects', label: 'Projects', path: '/projects', icon: 'briefcase', priority: 'P0' },
//   { id: 'schedule', label: 'Schedule', path: '/schedule', icon: 'square-chart-gantt', priority: 'P0' },
  { id: 'cost-control', label: 'Cost Control', path: '/cost-control', icon: 'wallet', priority: 'P0' },
  { id: 'risks', label: 'Risks & Issues', path: '/risks', icon: 'alert-triangle', priority: 'P0' },
];

export const secondaryNav: NavigationItem[] = [
  { id: 'site-map', label: 'Site Map', path: '/site-map', icon: 'map', priority: 'P1' },
  { id: 'calendar', label: 'Calendar', path: '/calendar', icon: 'calendar', priority: 'P1' },
  { id: 'documents', label: 'Documents', path: '/documents', icon: 'file-text', priority: 'P1' },
  { id: 'contractors', label: 'Contractors', path: '/contractors', icon: 'users', priority: 'P2' },
  { id: 'workflows', label: 'Workflows', path: '/workflows', icon: 'git-branch', priority: 'P1' },
  { id: 'reports', label: 'Reports', path: '/reports', icon: 'bar-chart-3', priority: 'P2' },
];
