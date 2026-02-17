import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export function ProjectsPage() {
  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Project list and actions will be added in later phases.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/projects/123">Open sample project</Link>
        </Button>
      </div>
    </section>
  )
}
