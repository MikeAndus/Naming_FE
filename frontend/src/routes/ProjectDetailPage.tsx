import { useParams } from 'react-router-dom'

import { Breadcrumbs } from '@/components/app/Breadcrumbs'

export function ProjectDetailPage() {
  const { id } = useParams()

  return (
    <section className="space-y-4">
      <Breadcrumbs items={[{ label: 'Dashboard', to: '/projects' }, { label: 'Project Detail' }]} />
      <h1 className="text-3xl font-semibold tracking-tight">Project Detail</h1>
      <p className="text-sm text-muted-foreground">Project ID: {id ?? 'unknown'}</p>
      <p className="text-sm text-muted-foreground">
        Details and workflow controls for this project will be added in upcoming phases.
      </p>
    </section>
  )
}
