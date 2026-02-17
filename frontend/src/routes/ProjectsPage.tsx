import { Link } from 'react-router-dom'

import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog'
import { Button } from '@/components/ui/button'
import { useProjectsListQuery } from '@/features/projects/queries'
import { getErrorMessage, type Project } from '@/lib/api'
import { formatDateTime } from '@/lib/date'

export function ProjectsPage() {
  const { data, error, isError, isLoading, refetch } = useProjectsListQuery()
  const projects = data?.items ?? []

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Browse projects from the API and open a project to view details.
          </p>
        </div>
        <CreateProjectDialog triggerSize="sm" />
      </header>

      {isLoading ? <ProjectsListSkeleton /> : null}

      {isError ? (
        <InlineErrorPanel message={getErrorMessage(error)} onRetry={() => void refetch()} />
      ) : null}

      {!isLoading && !isError && projects.length === 0 ? <EmptyState /> : null}

      {!isLoading && !isError && projects.length > 0 ? <ProjectsList projects={projects} /> : null}
    </section>
  )
}

function ProjectsListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div className="rounded-lg border bg-background p-4" key={index}>
          <div className="animate-pulse space-y-3">
            <div className="h-5 w-48 rounded bg-muted" />
            <div className="h-4 w-4/5 rounded bg-muted" />
            <div className="h-4 w-2/3 rounded bg-muted" />
            <div className="h-4 w-full max-w-xs rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  )
}

interface InlineErrorPanelProps {
  message: string
  onRetry: () => void
}

function InlineErrorPanel({ message, onRetry }: InlineErrorPanelProps) {
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-5">
      <p className="text-sm font-medium text-destructive">Unable to load projects.</p>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <div className="mt-4">
        <Button onClick={onRetry} type="button" variant="outline">
          Retry
        </Button>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed bg-background p-8 text-center">
      <h2 className="text-lg font-semibold">No projects yet</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Create your first project to start naming and version workflows.
      </p>
      <div className="mt-5 flex justify-center">
        <CreateProjectDialog />
      </div>
    </div>
  )
}

interface ProjectsListProps {
  projects: Project[]
}

function ProjectsList({ projects }: ProjectsListProps) {
  return (
    <div className="space-y-3">
      {projects.map((project) => {
        const description = project.description?.trim() ? project.description : 'No description'

        return (
          <Link
            className="block rounded-lg border bg-background p-4 transition hover:border-primary/40 hover:shadow-sm"
            key={project.id}
            to={`/projects/${project.id}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-base font-semibold">{project.name}</p>
                <p className="truncate text-sm text-muted-foreground">{description}</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="rounded-full border px-2 py-1 text-muted-foreground">
                  Versions: —
                </span>
                <span className="rounded-full border px-2 py-1 text-muted-foreground">
                  Latest: Coming
                </span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Created by: {project.created_by}</span>
              <span>Last updated: {formatDateTime(project.updated_at)}</span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
