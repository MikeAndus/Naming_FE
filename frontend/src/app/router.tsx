import { Navigate, createBrowserRouter } from 'react-router-dom'

import { App } from '@/app/App'
import { ProjectDetailPage } from '@/routes/ProjectDetailPage'
import { ProjectsPage } from '@/routes/ProjectsPage'
import { VersionPlaceholderPage } from '@/routes/VersionPlaceholderPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Navigate replace to="/projects" />,
      },
      {
        path: 'projects',
        children: [
          {
            index: true,
            element: <ProjectsPage />,
          },
          {
            path: ':id',
            element: <ProjectDetailPage />,
          },
          {
            path: ':id/versions/:vid',
            element: <VersionPlaceholderPage title="Version Overview" />,
          },
          {
            path: ':id/versions/:vid/run',
            element: <VersionPlaceholderPage title="Run" />,
          },
          {
            path: ':id/versions/:vid/territory-review',
            element: <VersionPlaceholderPage title="Territory Review" />,
          },
          {
            path: ':id/versions/:vid/generation-review',
            element: <VersionPlaceholderPage title="Generation Review" />,
          },
          {
            path: ':id/versions/:vid/results',
            element: <VersionPlaceholderPage title="Results" />,
          },
        ],
      },
    ],
  },
])
