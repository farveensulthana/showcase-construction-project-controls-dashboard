import { Routes } from '@angular/router';
import { Shell } from './layout/shell/shell';
import { Dashboard } from './pages/dashboard/dashboard';
import { Projects } from './pages/projects/projects';
import { ProjectDetail } from './pages/project-detail/project-detail';
import { Schedule } from './pages/schedule/schedule';
import { CostControl } from './pages/cost-control/cost-control';
import { Risks } from './pages/risks/risks';
import { SiteMap } from './pages/site-map/site-map';
import { Calendar } from './pages/calendar/calendar';
import { Documents } from './pages/documents/documents';
import { Workflows } from './pages/workflows/workflows';
import { Reports } from './pages/reports/reports';
import { NotFound } from './pages/not-found/not-found';

export const routes: Routes = [
  {
    path: '',
    component: Shell,
    children: [
      { path: '', component: Dashboard },
      { path: 'projects', component: Projects },
      { path: 'projects/:id', component: ProjectDetail },
      { path: 'schedule', component: Schedule },
      { path: 'cost-control', component: CostControl },
      { path: 'risks', component: Risks },
      { path: 'site-map', component: SiteMap },
      { path: 'calendar', component: Calendar },
      { path: 'documents', component: Documents },
      { path: 'workflows', component: Workflows },
      { path: 'reports', component: Reports },
      { path: '**', component: NotFound },
    ],
  },
];
