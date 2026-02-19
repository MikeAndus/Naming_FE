import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface DeepClearanceActionBarProps {
  showingCount: number
  totalCount: number
  selectedCount: number
  isRunStateEligible: boolean
  isPending: boolean
  onRunDeepClearance: () => void
}

export function DeepClearanceActionBar({
  showingCount,
  totalCount,
  selectedCount,
  isRunStateEligible,
  isPending,
  onRunDeepClearance,
}: DeepClearanceActionBarProps) {
  const isDisabledForSelection = selectedCount === 0
  const isDisabledForRunState = !isRunStateEligible
  const isButtonDisabled = isPending || isDisabledForSelection || isDisabledForRunState
  const buttonLabel = `Run deep clearance on ${selectedCount} names`

  return (
    <div className="sticky bottom-0 z-20 shrink-0 rounded-lg border bg-background/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {showingCount} of {totalCount}
        </p>

        {isDisabledForSelection ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex" tabIndex={0}>
                  <Button disabled={isButtonDisabled} onClick={onRunDeepClearance} type="button">
                    {buttonLabel}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Select at least one name for deep clearance</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Button disabled={isButtonDisabled} onClick={onRunDeepClearance} type="button">
            {buttonLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
