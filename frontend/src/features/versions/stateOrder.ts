const ORDERED_STATES = [
  'draft',
  'phase_1_running',
  'queued',
  'stage_0',
  'stage_1',
  'territory_review',
  'phase_2_running',
  'stage_2',
  'stage_3',
  'stage_4',
  'stage_5',
  'stage_6',
  'stage_7',
  'stage_8',
  'generation_review',
  'phase_3_running',
  'stage_9',
  'stage_10',
  'stage_11',
  'complete',
] as const

const STATE_ORDER = ORDERED_STATES.reduce<Record<string, number>>((result, state, index) => {
  result[state] = index
  return result
}, {})

export function getStateOrder(state: string | null | undefined): number | null {
  if (!state) {
    return null
  }

  const order = STATE_ORDER[state]
  return order === undefined ? null : order
}

export function isStateAtLeast(
  state: string | null | undefined,
  minimumState: string,
): boolean {
  const stateOrder = getStateOrder(state)
  const minimumOrder = getStateOrder(minimumState)

  if (stateOrder === null || minimumOrder === null) {
    return false
  }

  return stateOrder >= minimumOrder
}

export function getHighestStateOrder(
  ...states: Array<string | null | undefined>
): number | null {
  return states.reduce<number | null>((highest, state) => {
    const order = getStateOrder(state)
    if (order === null) {
      return highest
    }

    if (highest === null || order > highest) {
      return order
    }

    return highest
  }, null)
}
