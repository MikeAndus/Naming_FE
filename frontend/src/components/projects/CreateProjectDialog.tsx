import { useState } from 'react'

import { Button, type ButtonProps } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface CreateProjectDialogProps {
  triggerLabel?: string
  triggerSize?: ButtonProps['size']
  triggerVariant?: ButtonProps['variant']
}

export function CreateProjectDialog({
  triggerLabel = 'Create Project',
  triggerSize = 'default',
  triggerVariant = 'default',
}: CreateProjectDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger asChild>
        <Button size={triggerSize} variant={triggerVariant}>
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>
            Project creation flow is coming in a later phase. This CTA is wired in place for now.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setOpen(false)} type="button" variant="outline">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
