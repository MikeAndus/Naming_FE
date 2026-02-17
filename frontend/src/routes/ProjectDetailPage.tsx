import { useParams } from 'react-router-dom'

export function ProjectDetailPage() {
  const { id } = useParams()

  return (
    <section className="space-y-3">
      <h1 className="text-3xl font-semibold tracking-tight">Project Detail (coming soon)</h1>
      <p className="text-sm text-muted-foreground">Project ID: {id ?? 'unknown'}</p>
      <p className="text-sm text-muted-foreground">
        Future phases will add project metadata, versions, and review workflows.
      </p>
    </section>
  )
}
