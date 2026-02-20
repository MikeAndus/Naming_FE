import { Navigate, createBrowserRouter } from 'react-router-dom'

import { App } from '@/app/App'
import { ExecutiveSummaryPage } from '@/routes/ExecutiveSummaryPage'
import { GenerationReviewPage } from '@/routes/GenerationReviewPage'
import { ProjectDetailPage } from '@/routes/ProjectDetailPage'
import { ProjectsPage } from '@/routes/ProjectsPage'
import { RunMonitorPage } from '@/routes/RunMonitorPage'
import { TerritoryReviewPage } from '@/routes/TerritoryReviewPage'
import { VersionDetailPage } from '@/routes/VersionDetailPage'
import { VersionBuilderPage } from '@/routes/VersionBuilderPage'

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
            children: [
              {
                index: true,
                element: <VersionBuilderPage />,
              },
              {
                path: 'territory-review',
                element: <TerritoryReviewPage />,
              },
              {
                element: <VersionDetailPage />,
                children: [
                  {
                    path: 'results',
                    element: <GenerationReviewPage />,
                  },
                  {
                    path: 'generation-review',
                    element: <Navigate replace to="../results" />,
                  },
                  {
                    path: 'executive-summary',
                    element: <ExecutiveSummaryPage />,
                  },
                  {
                    path: 'runs/:runId/executive-summary',
                    element: <Navigate replace to="../../../executive-summary" />,
                  },
                  {
                    path: 'run-monitor',
                    element: <RunMonitorPage />,
                  },
                  {
                    path: 'run',
                    element: <Navigate replace to="../run-monitor" />,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
])
