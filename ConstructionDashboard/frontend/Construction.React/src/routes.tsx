import { createBrowserRouter } from 'react-router-dom';
import { Shell } from './layout/Shell';
import { CalendarPage, CostControlPage, DashboardPage, DocumentsPage, NotFoundPage, ProjectDetailPage, ProjectsPage, ReportsPage, RisksPage, SchedulePage, SiteMapPage, WorkflowsPage } from './pages';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'projects/:id', element: <ProjectDetailPage /> },
      { path: 'schedule', element: <SchedulePage /> },
      { path: 'cost-control', element: <CostControlPage /> },
      { path: 'risks', element: <RisksPage /> },
      { path: 'site-map', element: <SiteMapPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'documents', element: <DocumentsPage /> },
      { path: 'workflows', element: <WorkflowsPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
