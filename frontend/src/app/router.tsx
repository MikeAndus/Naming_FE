import { Navigate, createBrowserRouter } from 'react-router-dom'

import { App } from '@/app/App'
import { GenerationReviewPage } from '@/routes/GenerationReviewPage'
import { ProjectDetailPage } from '@/routes/ProjectDetailPage'
import { ProjectsPage } from '@/routes/ProjectsPage'
import { RunMonitorPage } from '@/routes/RunMonitorPage'
import { TerritoryReviewPage } from '@/routes/TerritoryReviewPage'
import { VersionBuilderPage } from '@/routes/VersionBuilderPage'
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
            path: ':projectId/versions/:versionId',
            element: <VersionBuilderPage />,
          },
          {
            path: ':projectId/versions/:versionId/run',
            element: <RunMonitorPage />,
          },
          {
            path: ':projectId/versions/:versionId/territory-review',
            element: <TerritoryReviewPage />,
          },
          {
            path: ':projectId/versions/:versionId/generation-review',
            element: <GenerationReviewPage />,
          },
          {
            path: ':projectId/versions/:versionId/results',
            element: <VersionPlaceholderPage phase={10} title="Results" />,
          },
        ],
      },
    ],
  },
])
