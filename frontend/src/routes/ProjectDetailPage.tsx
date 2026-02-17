import { useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Breadcrumbs } from '@/components/app/Breadcrumbs'
import { Button } from '@/components/ui/button'
import { useProjectDetailQuery } from '@/features/projects/queries'
import { getErrorMessage, isApiError } from '@/lib/api'
import { toast } from '@/hooks/use-toast'

export function ProjectDetailPage() {
  const { id } = useParams()
  const { data, error, errorUpdatedAt, isError, isLoading, refetch } = useProjectDetailQuery(id)
  const lastToastErrorTimeRef = useRef(0)
  const isNotFound = isError && isApiError(error) && error.status === 404

  useEffect(() => {
    if (!isError || isNotFound) {
      return
    }

    if (errorUpdatedAt <= lastToastErrorTimeRef.current) {
      return
    }

    lastToastErrorTimeRef.current = errorUpdatedAt

    toast({
      variant: 'destructive',
      title: 'Failed to load project',
      description: getErrorMessage(error, 'Please try again.'),
    })
  }, [error, errorUpdatedAt, isError, isNotFound])

  if (!id) {
    return (
      <section className="space-y-4">
        <Breadcrumbs
          items={[{ label: 'Dashboard', to: '/projects' }, { label: 'Project Detail' }]}
        />
        <div className="rounded-lg border bg-background p-6">
          <h1 className="text-xl font-semibold">Project ID is missing</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Open a project from the dashboard to view its details.
          </p>
          <div className="mt-4">
            <Button asChild>
              <Link to="/projects">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </section>
    )
  }

  if (isLoading) {
    return (
      <section className="space-y-5">
        <Breadcrumbs
          items={[{ label: 'Dashboard', to: '/projects' }, { label: 'Project Detail' }]}
        />
        <div className="space-y-3 rounded-lg border bg-background p-6">
          <div className="h-8 w-2/5 animate-pulse rounded bg-muted" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-4 rounded-lg border bg-background p-6">
          <div className="h-6 w-28 animate-pulse rounded bg-muted" />
          <div className="h-16 w-full animate-pulse rounded bg-muted" />
        </div>
      </section>
    )
  }

  if (isNotFound) {
    return (
      <section className="space-y-5">
        <Breadcrumbs
          items={[{ label: 'Dashboard', to: '/projects' }, { label: 'Project Detail' }]}
        />
        <div className="rounded-lg border bg-background p-6">
          <h1 className="text-2xl font-semibold tracking-tight">Project not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The requested project does not exist or may have been removed.
          </p>
          <div className="mt-4">
            <Button asChild>
              <Link to="/projects">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </section>
    )
  }

  if (isError) {
    return (
      <section className="space-y-5">
        <Breadcrumbs
          items={[{ label: 'Dashboard', to: '/projects' }, { label: 'Project Detail' }]}
        />
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6">
          <h1 className="text-xl font-semibold text-destructive">Unable to load project</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {getErrorMessage(error, 'An unexpected error occurred while loading this project.')}
          </p>
          <div className="mt-4">
            <Button onClick={() => void refetch()} type="button" variant="outline">
              Retry
            </Button>
          </div>
        </div>
      </section>
    )
  }

  const project = data
  if (!project) {
    return (
      <section className="space-y-5">
        <Breadcrumbs
          items={[{ label: 'Dashboard', to: '/projects' }, { label: 'Project Detail' }]}
        />
        <div className="rounded-lg border bg-background p-6">
          <h1 className="text-xl font-semibold">Project unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We could not load this project right now.
          </p>
          <div className="mt-4">
            <Button onClick={() => void refetch()} type="button" variant="outline">
              Retry
            </Button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <Breadcrumbs items={[{ label: 'Dashboard', to: '/projects' }, { label: 'Project Detail' }]} />

      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
        {project.description?.trim() ? (
          <p className="text-sm text-muted-foreground">{project.description}</p>
        ) : null}
      </header>

      <section className="space-y-4 rounded-lg border bg-background p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Versions</h2>
          <Button disabled title="Coming in Phase 2" type="button" variant="outline">
            Create Version
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">No versions yet</p>
        <p className="text-xs text-muted-foreground">Create Version is coming in Phase 2.</p>
      </section>
    </section>
  )
}
