import type { RunState } from '@/lib/api/runs.types'

export type StagePhase = 'phase_1' | 'phase_2' | 'phase_3'

export interface StageMetadata {
  stage_id: number
  label: string
  phase: StagePhase
}

export interface PhaseHeader {
  phase: StagePhase
  label: string
  stage_ids: number[]
}

export interface GateDefinition {
  after_stage_id: number
  label: string
  run_state: Extract<RunState, 'territory_review' | 'generation_review'>
}

export const STAGE_METADATA: readonly StageMetadata[] = [
  { stage_id: 0, label: 'Brief Intake', phase: 'phase_1' },
  { stage_id: 1, label: 'Territory Exploration', phase: 'phase_1' },
  { stage_id: 2, label: 'Generation Setup', phase: 'phase_2' },
  { stage_id: 3, label: 'Candidate Expansion', phase: 'phase_2' },
  { stage_id: 4, label: 'First-Pass Screening', phase: 'phase_2' },
  { stage_id: 5, label: 'Cluster Refinement', phase: 'phase_2' },
  { stage_id: 6, label: 'Linguistic Filtering', phase: 'phase_2' },
  { stage_id: 7, label: 'Quality Scoring', phase: 'phase_2' },
  { stage_id: 8, label: 'Generation Pack Assembly', phase: 'phase_2' },
  { stage_id: 9, label: 'Trademark Deep Check', phase: 'phase_3' },
  { stage_id: 10, label: 'Domain + Social Sweep', phase: 'phase_3' },
  { stage_id: 11, label: 'Final Recommendation', phase: 'phase_3' },
] as const

export const PHASE_HEADERS: readonly PhaseHeader[] = [
  {
    phase: 'phase_1',
    label: 'Phase 1: Research & Territories (Stages 0-1)',
    stage_ids: [0, 1],
  },
  {
    phase: 'phase_2',
    label: 'Phase 2: Generation & Fast Screening (Stages 2-8)',
    stage_ids: [2, 3, 4, 5, 6, 7, 8],
  },
  {
    phase: 'phase_3',
    label: 'Phase 3: Deep Clearance (Stages 9-11)',
    stage_ids: [9, 10, 11],
  },
] as const

export const GATE_DEFINITIONS: readonly GateDefinition[] = [
  {
    after_stage_id: 1,
    label: 'Territory Review',
    run_state: 'territory_review',
  },
  {
    after_stage_id: 8,
    label: 'Generation Review',
    run_state: 'generation_review',
  },
] as const

const STAGE_METADATA_BY_ID = new Map(STAGE_METADATA.map((stage) => [stage.stage_id, stage] as const))
const GATE_BY_STAGE_ID = new Map(
  GATE_DEFINITIONS.map((gate) => [gate.after_stage_id, gate] as const),
)

export function getStageMetadata(stageId: number): StageMetadata | undefined {
  return STAGE_METADATA_BY_ID.get(stageId)
}

export function getStageLabel(stageId: number): string {
  return STAGE_METADATA_BY_ID.get(stageId)?.label ?? `Stage ${stageId}`
}

export function getStagePhase(stageId: number): StagePhase | undefined {
  return STAGE_METADATA_BY_ID.get(stageId)?.phase
}

export function getGateDefinition(afterStageId: number): GateDefinition | undefined {
  return GATE_BY_STAGE_ID.get(afterStageId)
}
