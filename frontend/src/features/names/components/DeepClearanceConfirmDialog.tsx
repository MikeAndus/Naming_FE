import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { NameCandidateResponse } from '@/lib/api'

interface DeepClearanceConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedNames: NameCandidateResponse[]
  mode: 'start' | 'retry'
  isRunStateEligible: boolean
  isPending: boolean
  onConfirm: () => void
  retryFromStage?: number
}

export function DeepClearanceConfirmDialog({
  open,
  onOpenChange,
  selectedNames,
  mode,
  isRunStateEligible,
  isPending,
  onConfirm,
  retryFromStage,
}: DeepClearanceConfirmDialogProps) {
  const selectedCount = selectedNames.length
  const isConfirmDisabled = selectedCount === 0 || !isRunStateEligible || isPending

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!isPending) {
          onOpenChange(nextOpen)
        }
      }}
      open={open}
    >
      <DialogContent
        className="sm:max-w-xl"
        onEscapeKeyDown={(event) => {
          if (isPending) {
            event.preventDefault()
          }
        }}
        onPointerDownOutside={(event) => {
          if (isPending) {
            event.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{mode === 'retry' ? 'Retry deep clearance' : 'Run deep clearance'}</DialogTitle>
          <DialogDescription>
            {mode === 'retry'
              ? `This retries deep clearance from Stage ${retryFromStage ?? 9} for the selected names.`
              : 'This will start deep clearance for the selected names and continue the run.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm font-medium">Selected names ({selectedCount})</p>
          {selectedCount === 0 ? (
            <p className="text-sm text-muted-foreground">No names selected.</p>
          ) : (
            <ul className="max-h-60 list-disc space-y-1 overflow-y-auto rounded-md border p-3 pl-8 text-sm">
              {selectedNames.map((candidate) => (
                <li key={candidate.id}>{candidate.name_text}</li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button
            disabled={isPending}
            onClick={() => {
              onOpenChange(false)
            }}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={isConfirmDisabled} onClick={onConfirm} type="button">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              mode === 'retry' ? 'Retry now' : 'Confirm'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
