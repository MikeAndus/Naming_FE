import { Link, useNavigate } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  useCreateBlankVersionMutation,
  useForkVersionMutation,
  useProjectVersionsQuery,
} from '@/features/versions/queries'
import { getErrorMessage, type ProjectVersionListItem } from '@/lib/api'
import { formatDateTime } from '@/lib/date'
import { toast } from '@/hooks/use-toast'

interface ProjectVersionsSectionProps {
  projectId: string
}

function formatVersionLabel(versionNumber: number): string {
  if (versionNumber > 0) {
    return `v${versionNumber}`
  }

  return 'v-'
}

function getSummarySnippet(summarySnippet: string | null): string {
  if (!summarySnippet?.trim()) {
    return 'Untitled'
  }

  return summarySnippet
}

function VersionStateBadge({ state }: { state: string }) {
  if (state === 'draft') {
    return <Badge variant="secondary">Draft</Badge>
  }
  if (state === 'phase_1_running') {
    return <Badge variant="outline">Phase 1 Running</Badge>
  }
  if (state === 'territory_review') {
    return <Badge variant="outline">Territory Review</Badge>
  }
  if (state === 'phase_2_running') {
    return <Badge variant="outline">Phase 2 Running</Badge>
  }
  if (state === 'generation_review') {
    return <Badge variant="outline">Generation Review</Badge>
  }
  if (state === 'phase_3_running') {
    return <Badge variant="outline">Phase 3 Running</Badge>
  }
  if (state === 'complete') {
    return <Badge>Complete</Badge>
  }
  if (state === 'failed') {
    return <Badge variant="destructive">Failed</Badge>
  }

  return <Badge variant="outline">{state.replaceAll('_', ' ')}</Badge>
}

function VersionRowActions({
  isForking,
  onFork,
  projectId,
  version,
}: {
  isForking: boolean
  onFork: (versionId: string) => void
  projectId: string
  version: ProjectVersionListItem
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button asChild size="sm" variant="outline">
        <Link to={`/projects/${projectId}/versions/${version.id}`}>Edit</Link>
      </Button>
      <Button disabled={isForking} onClick={() => onFork(version.id)} size="sm" type="button">
        {isForking ? 'Forking...' : 'Fork'}
      </Button>
    </div>
  )
}

export function ProjectVersionsSection({ projectId }: ProjectVersionsSectionProps) {
  const navigate = useNavigate()
  const versionsQuery = useProjectVersionsQuery(projectId)
  const createVersionMutation = useCreateBlankVersionMutation()
  const forkVersionMutation = useForkVersionMutation()

  const versions = versionsQuery.data ?? []
  const pendingForkVersionId = forkVersionMutation.isPending
    ? forkVersionMutation.variables?.versionId
    : undefined

  const handleCreateVersion = () => {
    createVersionMutation.mutate(
      { projectId },
      {
        onError: (error) => {
          toast({
            variant: 'destructive',
            title: 'Failed to create version',
            description: getErrorMessage(error, 'Please try again.'),
          })
        },
        onSuccess: (version) => {
          navigate(`/projects/${projectId}/versions/${version.id}`)
        },
      },
    )
  }

  const handleForkVersion = (versionId: string) => {
    forkVersionMutation.mutate(
      { versionId },
      {
        onError: (error) => {
          toast({
            variant: 'destructive',
            title: 'Failed to fork version',
            description: getErrorMessage(error, 'Please try again.'),
          })
        },
        onSuccess: (version) => {
          toast({
            title: 'Version forked',
            description: `Opening ${formatVersionLabel(version.version_number)}.`,
          })
          navigate(`/projects/${projectId}/versions/${version.id}`)
        },
      },
    )
  }

  if (versionsQuery.isLoading) {
    return (
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Versions</CardTitle>
          <Button disabled type="button">
            New Version
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-10 animate-pulse rounded bg-muted" />
          <div className="h-10 animate-pulse rounded bg-muted" />
          <div className="h-10 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    )
  }

  if (versionsQuery.isError) {
    return (
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Versions</CardTitle>
          <Button
            disabled={createVersionMutation.isPending}
            onClick={handleCreateVersion}
            type="button"
          >
            {createVersionMutation.isPending ? 'Creating...' : 'New Version'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {getErrorMessage(versionsQuery.error, 'Unable to load versions right now.')}
          </p>
          <Button onClick={() => void versionsQuery.refetch()} type="button" variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (versions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Versions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            No versions yet. Create your first version to start naming.
          </p>
          <Button disabled={createVersionMutation.isPending} onClick={handleCreateVersion} type="button">
            {createVersionMutation.isPending ? 'Creating...' : 'New Version'}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Versions</CardTitle>
        <Button disabled={createVersionMutation.isPending} onClick={handleCreateVersion} type="button">
          {createVersionMutation.isPending ? 'Creating...' : 'New Version'}
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="w-20 py-2 pr-3 font-medium">Version</th>
              <th className="w-28 py-2 pr-3 font-medium">State</th>
              <th className="w-44 py-2 pr-3 font-medium">Created</th>
              <th className="py-2 pr-3 font-medium">Summary</th>
              <th className="w-36 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((version) => (
              <tr className="border-b align-middle last:border-b-0" key={version.id}>
                <td className="py-3 pr-3 font-medium">{formatVersionLabel(version.version_number)}</td>
                <td className="py-3 pr-3">
                  <VersionStateBadge state={version.state} />
                </td>
                <td className="py-3 pr-3 text-muted-foreground">{formatDateTime(version.created_at)}</td>
                <td className="truncate py-3 pr-3 text-muted-foreground">
                  {getSummarySnippet(version.summary_snippet)}
                </td>
                <td className="py-3">
                  <VersionRowActions
                    isForking={pendingForkVersionId === version.id}
                    onFork={handleForkVersion}
                    projectId={projectId}
                    version={version}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
