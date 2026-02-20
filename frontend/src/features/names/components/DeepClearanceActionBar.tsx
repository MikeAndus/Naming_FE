import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface DeepClearanceActionBarProps {
  showingCount: number
  totalCount: number
  selectedCount: number
  mode: 'start' | 'retry'
  isRunStateEligible: boolean
  isPending: boolean
  onRunDeepClearance: () => void
}

export function DeepClearanceActionBar({
  showingCount,
  totalCount,
  selectedCount,
  mode,
  isRunStateEligible,
  isPending,
  onRunDeepClearance,
}: DeepClearanceActionBarProps) {
  const isDisabledForSelection = selectedCount === 0
  const isDisabledForRunState = !isRunStateEligible
  const isButtonDisabled = isPending || isDisabledForSelection || isDisabledForRunState
  const buttonLabel =
    mode === 'retry'
      ? `Retry deep clearance on ${selectedCount} names`
      : `Run deep clearance on ${selectedCount} names`
  const tooltipText = isDisabledForRunState
    ? mode === 'retry'
      ? 'Deep-clearance retry is available once the run is complete.'
      : 'Deep clearance is available during generation review.'
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
