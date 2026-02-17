import { useLocation, useParams } from 'react-router-dom'

interface VersionPlaceholderPageProps {
  title: string
  phase: number
}

export function VersionPlaceholderPage({ title, phase }: VersionPlaceholderPageProps) {
  const params = useParams()
  const projectId = params.projectId ?? params.id
  const versionId = params.versionId ?? params.vid
  const location = useLocation()

  return (
    <section className="space-y-3">
      <h1 className="text-3xl font-semibold tracking-tight">{title} (coming soon)</h1>
      <p className="text-sm text-muted-foreground">Coming in Phase {phase}</p>
      <p className="text-sm text-muted-foreground">Project ID: {projectId ?? 'unknown'}</p>
      <p className="text-sm text-muted-foreground">Version ID: {versionId ?? 'unknown'}</p>
      <p className="rounded-md border bg-background px-3 py-2 font-mono text-xs text-muted-foreground">
        {location.pathname}
      </p>
    </section>
  )
}
