import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface DeepClearanceActionBarProps {
  showingCount: number
  totalCount: number
  selectedCount: number
  isTerminalComplete: boolean
  isRunStateEligible: boolean
  isPending: boolean
  onRunDeepClearance: () => void
}

export function DeepClearanceActionBar({
  showingCount,
  totalCount,
  selectedCount,
  isTerminalComplete,
  isRunStateEligible,
  isPending,
  onRunDeepClearance,
}: DeepClearanceActionBarProps) {
  const isDisabledForSelection = selectedCount === 0
  const isDisabledForRunState = !isRunStateEligible && !isTerminalComplete
  const isButtonDisabled =
    isPending || isDisabledForSelection || isDisabledForRunState || isTerminalComplete
  const buttonLabel = `Run deep clearance on ${selectedCount} names`
  const tooltipText = isTerminalComplete
    ? 'Deep clearance complete. Fork this version to run clearance on additional names.'
    : isDisabledForSelection
      ? 'Select at least one name for deep clearance'
      : null

  return (
    <div className="sticky bottom-0 z-20 shrink-0 rounded-lg border bg-background/95 px-4 py-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {showingCount} of {totalCount}
        </p>

        {tooltipText ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex" tabIndex={0}>
                  <Button disabled={isButtonDisabled} onClick={onRunDeepClearance} type="button">
                    {buttonLabel}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{tooltipText}</TooltipContent>
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
