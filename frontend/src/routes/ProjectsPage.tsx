import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

export function ProjectsPage() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Projects (coming soon)</h1>
        <p className="text-sm text-muted-foreground">
          App shell, routing, shadcn/ui, and query providers are configured.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() =>
            toast({
              title: 'Toast is wired',
              description: 'Global toaster is mounted at the app root.',
            })
          }
        >
          Show test toast
        </Button>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open sample dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dialog is wired</DialogTitle>
              <DialogDescription>
                This is a placeholder modal to verify Radix + shadcn wiring.
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  )
}
