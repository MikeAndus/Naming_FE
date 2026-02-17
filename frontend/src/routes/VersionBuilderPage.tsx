import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Breadcrumbs } from '@/components/app/Breadcrumbs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { ToastAction } from '@/components/ui/toast'
import { useProjectDetailQuery } from '@/features/projects/queries'
import { isTerminalRunState, useRunStatusQuery, useStartRunMutation } from '@/features/runs/queries'
import { usePatchVersionMutation, useVersionDetailQuery } from '@/features/versions/queries'
import {
  getErrorMessage,
  isApiError,
  parseApiErrorDetail,
  type PatchVersionPayload,
} from '@/lib/api'
import { toast } from '@/hooks/use-toast'

type SectionKey = 'brief' | 'hotspots' | 'dials'
type SaveReason = 'autosave' | 'blur' | 'manual' | 'unmount'

type PriceTier = 'value' | 'mid' | 'premium'
type Channel = 'dtc' | 'retail' | 'amazon' | 'b2b' | 'mixed'
type FormatMode = 'one_word' | 'two_word' | 'any'
type TrademarkPosture = 'conservative' | 'balanced' | 'bold'
type SocialCheck = 'instagram' | 'tiktok' | 'facebook' | 'twitter' | 'linkedin' | 'youtube'

interface BriefState {
  what_it_is: string
  description: string
  target_market: string
  audience_context: string
  price_tier: PriceTier
  channel: Channel
  playful_serious: number
  modern_heritage: number
  mass_premium: number
  bold_calm: number
  differentiators: string[]
  no_go_words: string[]
  must_avoid_implying: string
}

interface HotspotState {
  id: string
  name: string
  paragraph: string
  weight: string
}

interface DialsState {
  format_mode: FormatMode
  trademark_posture: TrademarkPosture
  social_checks: SocialCheck[]
  domain_check_enabled: boolean
}

interface ValidationResult {
  fieldErrors: Record<string, string>
  sectionError?: string
}

const PRICE_TIERS: PriceTier[] = ['value', 'mid', 'premium']
const CHANNELS: Channel[] = ['dtc', 'retail', 'amazon', 'b2b', 'mixed']
const FORMAT_MODES: FormatMode[] = ['one_word', 'two_word', 'any']
const TRADEMARK_POSTURES: TrademarkPosture[] = ['conservative', 'balanced', 'bold']
const SOCIAL_CHECK_OPTIONS: SocialCheck[] = [
  'instagram',
  'tiktok',
  'facebook',
  'twitter',
  'linkedin',
  'youtube',
]
const SECTION_ORDER: SectionKey[] = ['brief', 'hotspots', 'dials']

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function readNestedString(value: unknown, key: string, nestedKey?: string): string {
  if (!isRecord(value)) {
    return ''
  }

  if (typeof value[key] === 'string') {
    return value[key]
  }

  if (nestedKey && isRecord(value[key]) && typeof value[key][nestedKey] === 'string') {
    return value[key][nestedKey] as string
  }

  return ''
}

function readNestedNumber(value: unknown, key: string, fallback: number): number {
  if (!isRecord(value)) {
    return fallback
  }

  const raw = value[key]
  if (typeof raw !== 'number' || Number.isNaN(raw)) {
    return fallback
  }

  if (raw < 1) {
    return 1
  }
  if (raw > 5) {
    return 5
  }
  return raw
}

function createHotspotState(): HotspotState {
  return {
    id:
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `hotspot-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: '',
    paragraph: '',
    weight: '',
  }
}

function normalizeBrief(value: unknown): BriefState {
  const differentiators = isRecord(value) && Array.isArray(value.differentiators) ? value.differentiators : []
  const noGoWords = isRecord(value) && Array.isArray(value.no_go_words) ? value.no_go_words : []

  const normalizedDifferentiators = differentiators
    .filter((item): item is string => typeof item === 'string')
    .slice(0, 7)
  while (normalizedDifferentiators.length < 3) {
    normalizedDifferentiators.push('')
  }

  const normalizedNoGoWords = noGoWords
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)

  const priceTier = readNestedString(value, 'price_tier')
  const channel = readNestedString(value, 'channel')

  return {
    what_it_is: readNestedString(value, 'what_it_is'),
    description: readNestedString(value, 'description'),
    target_market: readNestedString(value, 'target_market'),
    audience_context: readNestedString(value, 'audience_context'),
    price_tier: PRICE_TIERS.includes(priceTier as PriceTier) ? (priceTier as PriceTier) : 'mid',
    channel: CHANNELS.includes(channel as Channel) ? (channel as Channel) : 'mixed',
    playful_serious: readNestedNumber(value, 'playful_serious', 3),
    modern_heritage: readNestedNumber(value, 'modern_heritage', 3),
    mass_premium: readNestedNumber(value, 'mass_premium', 3),
    bold_calm: readNestedNumber(value, 'bold_calm', 3),
    differentiators: normalizedDifferentiators,
    no_go_words: normalizedNoGoWords,
    must_avoid_implying: readNestedString(value, 'must_avoid_implying'),
  }
}

function normalizeHotspots(value: unknown): HotspotState[] {
  const source = Array.isArray(value) ? value : []
  const normalized = source
    .filter((item) => isRecord(item))
    .slice(0, 6)
    .map((item, index) => {
      const itemId =
        typeof item.id === 'string' && item.id.trim()
          ? item.id
          : `hotspot-${index}-${Date.now()}-${Math.random().toString(16).slice(2)}`
      const weight =
        typeof item.weight === 'number' && Number.isFinite(item.weight) ? String(item.weight) : ''

      return {
        id: itemId,
        name: typeof item.name === 'string' ? item.name : '',
        paragraph: typeof item.paragraph === 'string' ? item.paragraph : '',
        weight,
      }
    })

  if (normalized.length > 0) {
    return normalized
  }

  return [createHotspotState(), createHotspotState()]
}

function normalizeDials(value: unknown): DialsState {
  const formatMode = readNestedString(value, 'format_mode')
  const trademarkPosture = readNestedString(value, 'trademark_posture')
  const socialChecks =
    isRecord(value) && Array.isArray(value.social_checks) ? value.social_checks : []

  return {
    format_mode: FORMAT_MODES.includes(formatMode as FormatMode)
      ? (formatMode as FormatMode)
      : 'any',
    trademark_posture: TRADEMARK_POSTURES.includes(trademarkPosture as TrademarkPosture)
      ? (trademarkPosture as TrademarkPosture)
      : 'balanced',
    social_checks: socialChecks.filter(
      (item): item is SocialCheck =>
        typeof item === 'string' &&
        SOCIAL_CHECK_OPTIONS.includes(item as SocialCheck),
    ),
    domain_check_enabled: true,
  }
}

function serializeBrief(brief: BriefState): BriefState {
  return {
    ...brief,
    what_it_is: brief.what_it_is.trim(),
    description: brief.description.trim(),
    target_market: brief.target_market.trim(),
    audience_context: brief.audience_context.trim(),
    differentiators: brief.differentiators.map((item) => item.trim()),
    no_go_words: [...new Set(brief.no_go_words.map((item) => item.trim()).filter(Boolean))],
    must_avoid_implying: brief.must_avoid_implying.trim(),
  }
}

function serializeHotspots(hotspots: HotspotState[]): Array<{ id: string; name: string; paragraph: string; weight?: number }> {
  return hotspots.map((hotspot) => {
    const parsedWeight = hotspot.weight.trim() ? Number(hotspot.weight) : undefined

    return {
      id: hotspot.id,
      name: hotspot.name.trim(),
      paragraph: hotspot.paragraph.trim(),
      ...(Number.isFinite(parsedWeight) ? { weight: parsedWeight } : {}),
    }
  })
}

function serializeDials(dials: DialsState): DialsState {
  return {
    ...dials,
    social_checks: dials.social_checks.filter((value, index, array) => array.indexOf(value) === index),
    domain_check_enabled: true,
  }
}

function validateBrief(brief: BriefState): ValidationResult {
  const fieldErrors: Record<string, string> = {}

  if (!brief.what_it_is.trim()) {
    fieldErrors['brief.what_it_is'] = 'Required.'
  } else if (brief.what_it_is.trim().length > 200) {
    fieldErrors['brief.what_it_is'] = 'Must be 200 characters or less.'
  }

  if (!brief.description.trim()) {
    fieldErrors['brief.description'] = 'Required.'
  } else if (brief.description.trim().length > 2000) {
    fieldErrors['brief.description'] = 'Must be 2000 characters or less.'
  }

  if (!brief.target_market.trim()) {
    fieldErrors['brief.target_market'] = 'Required.'
  } else if (brief.target_market.trim().length > 1000) {
    fieldErrors['brief.target_market'] = 'Must be 1000 characters or less.'
  }

  if (!brief.audience_context.trim()) {
    fieldErrors['brief.audience_context'] = 'Required.'
  } else if (brief.audience_context.trim().length > 1000) {
    fieldErrors['brief.audience_context'] = 'Must be 1000 characters or less.'
  }

  if (!PRICE_TIERS.includes(brief.price_tier)) {
    fieldErrors['brief.price_tier'] = 'Select a price tier.'
  }

  if (!CHANNELS.includes(brief.channel)) {
    fieldErrors['brief.channel'] = 'Select a channel.'
  }

  if (brief.playful_serious < 1 || brief.playful_serious > 5) {
    fieldErrors['brief.playful_serious'] = 'Must be between 1 and 5.'
  }
  if (brief.modern_heritage < 1 || brief.modern_heritage > 5) {
    fieldErrors['brief.modern_heritage'] = 'Must be between 1 and 5.'
  }
  if (brief.mass_premium < 1 || brief.mass_premium > 5) {
    fieldErrors['brief.mass_premium'] = 'Must be between 1 and 5.'
  }
  if (brief.bold_calm < 1 || brief.bold_calm > 5) {
    fieldErrors['brief.bold_calm'] = 'Must be between 1 and 5.'
  }

  brief.differentiators.forEach((item, index) => {
    if (!item.trim()) {
      fieldErrors[`brief.differentiators.${index}`] = 'Required.'
      return
    }
    if (item.trim().length > 500) {
      fieldErrors[`brief.differentiators.${index}`] = 'Must be 500 characters or less.'
    }
  })

  let sectionError: string | undefined
  if (brief.differentiators.length < 3 || brief.differentiators.length > 7) {
    sectionError = 'Differentiators must have between 3 and 7 items.'
  }

  brief.no_go_words.forEach((item, index) => {
    if (item.length > 100) {
      fieldErrors[`brief.no_go_words.${index}`] = 'No-go words must be 100 characters or less.'
    }
  })

  if (brief.must_avoid_implying.length > 1000) {
    fieldErrors['brief.must_avoid_implying'] = 'Must be 1000 characters or less.'
  }

  return { fieldErrors, sectionError }
}

function validateHotspots(hotspots: HotspotState[]): ValidationResult {
  const fieldErrors: Record<string, string> = {}
  let sectionError: string | undefined

  if (hotspots.length < 2 || hotspots.length > 6) {
    sectionError = 'Hotspots must have between 2 and 6 items.'
  }

  hotspots.forEach((hotspot, index) => {
    if (!hotspot.name.trim()) {
      fieldErrors[`hotspots.${index}.name`] = 'Required.'
    } else if (hotspot.name.trim().length > 200) {
      fieldErrors[`hotspots.${index}.name`] = 'Must be 200 characters or less.'
    }

    if (!hotspot.paragraph.trim()) {
      fieldErrors[`hotspots.${index}.paragraph`] = 'Required.'
    } else if (hotspot.paragraph.trim().length > 2000) {
      fieldErrors[`hotspots.${index}.paragraph`] = 'Must be 2000 characters or less.'
    }

    if (hotspot.weight.trim()) {
      const weight = Number(hotspot.weight)
      if (!Number.isInteger(weight) || weight < 1 || weight > 10) {
        fieldErrors[`hotspots.${index}.weight`] = 'Weight must be an integer between 1 and 10.'
      }
    }
  })

  return { fieldErrors, sectionError }
}

function validateDials(dials: DialsState): ValidationResult {
  const fieldErrors: Record<string, string> = {}

  if (!FORMAT_MODES.includes(dials.format_mode)) {
    fieldErrors['dials.format_mode'] = 'Select a format mode.'
  }

  if (!TRADEMARK_POSTURES.includes(dials.trademark_posture)) {
    fieldErrors['dials.trademark_posture'] = 'Select a trademark posture.'
  }

  return { fieldErrors }
}

function isBriefCompleteForStartRun(
  brief: BriefState,
  hotspots: HotspotState[],
  dials: DialsState,
): boolean {
  const briefValidation = validateBrief(brief)
  const hotspotsValidation = validateHotspots(hotspots)
  const dialsValidation = validateDials(dials)

  const differentiatorsCount = brief.differentiators.filter((item) => item.trim()).length

  return (
    !briefValidation.sectionError &&
    Object.keys(briefValidation.fieldErrors).length === 0 &&
    !hotspotsValidation.sectionError &&
    Object.keys(hotspotsValidation.fieldErrors).length === 0 &&
    Object.keys(dialsValidation.fieldErrors).length === 0 &&
    hotspots.length >= 2 &&
    differentiatorsCount >= 3
  )
}

function parse422ValidationErrors(error: unknown): ValidationResult & { section: SectionKey | null } {
  if (!isApiError(error) || error.status !== 422) {
    return { fieldErrors: {}, section: null }
  }

  const fieldErrors: Record<string, string> = {}
  let section: SectionKey | null = null
  let sectionError: string | undefined

  const detail = parseApiErrorDetail(error.body)
  if (!Array.isArray(detail)) {
    return {
      fieldErrors,
      section,
      sectionError: getErrorMessage(error, 'Validation failed.'),
    }
  }

  detail.forEach((item) => {
    if (!isRecord(item)) {
      return
    }
    const message = typeof item.msg === 'string' ? item.msg : 'Invalid value.'
    const rawLoc = Array.isArray(item.loc) ? item.loc : []
    const loc = rawLoc.filter((part): part is string | number => typeof part === 'string' || typeof part === 'number')
    const normalizedLoc = loc[0] === 'body' ? loc.slice(1) : loc
    if (normalizedLoc.length === 0) {
      sectionError = message
      return
    }

    const root = normalizedLoc[0]
    if (root !== 'brief' && root !== 'hotspots' && root !== 'dials') {
      sectionError = message
      return
    }

    section = section ?? root
    const path = normalizedLoc.join('.')
    fieldErrors[path] = message
  })

  return { fieldErrors, section, sectionError }
}

function VersionStateBadge({ state }: { state: string }) {
  if (state === 'draft') {
    return <Badge>Draft</Badge>
  }

  return <Badge variant="outline">{state}</Badge>
}

function SectionHeader({
  expanded,
  onToggle,
  title,
}: {
  expanded: boolean
  onToggle: () => void
  title: string
}) {
  return (
    <button
      className="flex w-full items-center justify-between text-left"
      onClick={onToggle}
      type="button"
    >
      <h3 className="text-lg font-semibold">{title}</h3>
      <span className="text-sm text-muted-foreground">{expanded ? 'Collapse' : 'Expand'}</span>
    </button>
  )
}

function BuilderSkeleton() {
  return (
    <div className="hidden space-y-4 lg:block">
      {[1, 2, 3].map((item) => (
        <Card key={item}>
          <CardHeader>
            <div className="h-6 w-44 animate-pulse rounded bg-muted" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-9 w-full animate-pulse rounded bg-muted" />
            <div className="h-24 w-full animate-pulse rounded bg-muted" />
            <div className="h-9 w-2/3 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function VersionBuilderPage() {
  const navigate = useNavigate()
  const { projectId, versionId } = useParams()
  const versionQuery = useVersionDetailQuery(versionId)
  const projectQuery = useProjectDetailQuery(projectId)
  const patchMutation = usePatchVersionMutation()
  const startRunMutation = useStartRunMutation()

  const [brief, setBrief] = useState<BriefState | null>(null)
  const [hotspots, setHotspots] = useState<HotspotState[]>([])
  const [dials, setDials] = useState<DialsState | null>(null)
  const [noGoWordInput, setNoGoWordInput] = useState('')
  const [collapsedSections, setCollapsedSections] = useState<Record<SectionKey, boolean>>({
    brief: false,
    hotspots: false,
    dials: false,
  })
  const [dirtySections, setDirtySections] = useState<Record<SectionKey, boolean>>({
    brief: false,
    hotspots: false,
    dials: false,
  })
  const [clientFieldErrors, setClientFieldErrors] = useState<Record<string, string>>({})
  const [clientSectionErrors, setClientSectionErrors] = useState<Partial<Record<SectionKey, string>>>({})
  const [serverFieldErrors, setServerFieldErrors] = useState<Record<string, string>>({})
  const [serverSectionErrors, setServerSectionErrors] = useState<Partial<Record<SectionKey, string>>>({})
  const [forcedReadOnly, setForcedReadOnly] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastEditAt, setLastEditAt] = useState(0)

  const lastVersionSnapshotRef = useRef<string | null>(null)
  const isSavingRef = useRef(false)
  const dirtySectionsRef = useRef(dirtySections)
  const canEditRef = useRef(false)
  const saveDirtySectionsRef = useRef<
    (sections?: SectionKey[], reason?: SaveReason) => Promise<{ savedCount: number; hadFailure: boolean }>
  >(async () => ({ savedCount: 0, hadFailure: false }))

  const hasDirty = useMemo(
    () => SECTION_ORDER.some((section) => dirtySections[section]),
    [dirtySections],
  )

  useEffect(() => {
    dirtySectionsRef.current = dirtySections
  }, [dirtySections])

  useEffect(() => {
    isSavingRef.current = isSaving
  }, [isSaving])

  const version = versionQuery.data
  const latestRunId = version?.latest_run_id ?? null
  const runStatusQuery = useRunStatusQuery(latestRunId ?? undefined)
  const isDraft = version?.state === 'draft'
  const canEdit = Boolean(versionId && version && isDraft && !forcedReadOnly)
  const isRunActive =
    Boolean(latestRunId) &&
    (runStatusQuery.data ? !isTerminalRunState(runStatusQuery.data.state) : true)

  useEffect(() => {
    canEditRef.current = canEdit
  }, [canEdit])

  useEffect(() => {
    if (!version) {
      return
    }

    const snapshotKey = `${version.id}:${version.updated_at}`
    if (lastVersionSnapshotRef.current === snapshotKey) {
      return
    }
    if (hasDirty && version.id === versionId) {
      return
    }

    setBrief(normalizeBrief(version.brief))
    setHotspots(normalizeHotspots(version.hotspots))
    setDials(normalizeDials(version.dials))
    setDirtySections({ brief: false, hotspots: false, dials: false })
    setClientFieldErrors({})
    setClientSectionErrors({})
    setServerFieldErrors({})
    setServerSectionErrors({})
    setForcedReadOnly(version.state !== 'draft' ? true : false)
    setNoGoWordInput('')
    lastVersionSnapshotRef.current = snapshotKey
  }, [hasDirty, version, versionId])

  const breadcrumbProjectLabel =
    projectQuery.data?.name || (projectId ? `Project ${projectId}` : 'Project')
  const versionLabel = version ? `v${version.version_number}` : 'Version'
  const isStartRunReady = useMemo(() => {
    if (!brief || !dials) {
      return false
    }

    return isBriefCompleteForStartRun(brief, hotspots, dials)
  }, [brief, dials, hotspots])

  const getFieldError = useCallback(
    (path: string) => serverFieldErrors[path] ?? clientFieldErrors[path],
    [clientFieldErrors, serverFieldErrors],
  )

  const getSectionError = useCallback(
    (section: SectionKey) => serverSectionErrors[section] ?? clientSectionErrors[section],
    [clientSectionErrors, serverSectionErrors],
  )

  const markDirty = useCallback((section: SectionKey) => {
    setDirtySections((prev) => {
      if (prev[section]) {
        return prev
      }
      return { ...prev, [section]: true }
    })
    setLastEditAt(Date.now())
  }, [])

  const clearSectionErrors = useCallback((section: SectionKey) => {
    setClientSectionErrors((prev) => ({ ...prev, [section]: undefined }))
    setServerSectionErrors((prev) => ({ ...prev, [section]: undefined }))
  }, [])

  const clearFieldError = useCallback((path: string) => {
    setClientFieldErrors((prev) => {
      if (!prev[path]) {
        return prev
      }
      const next = { ...prev }
      delete next[path]
      return next
    })
    setServerFieldErrors((prev) => {
      if (!prev[path]) {
        return prev
      }
      const next = { ...prev }
      delete next[path]
      return next
    })
  }, [])

  const runSectionValidation = useCallback(
    (section: SectionKey): ValidationResult => {
      if (section === 'brief') {
        return validateBrief(brief ?? normalizeBrief(null))
      }
      if (section === 'hotspots') {
        return validateHotspots(hotspots)
      }
      return validateDials(dials ?? normalizeDials(null))
    },
    [brief, dials, hotspots],
  )

  const setValidationErrors = useCallback((section: SectionKey, result: ValidationResult) => {
    const sectionPrefix = `${section}.`
    setClientFieldErrors((prev) => {
      const next: Record<string, string> = {}
      Object.keys(prev).forEach((key) => {
        if (!key.startsWith(sectionPrefix)) {
          next[key] = prev[key]
        }
      })
      return { ...next, ...result.fieldErrors }
    })
    setClientSectionErrors((prev) => ({ ...prev, [section]: result.sectionError }))
  }, [])

  const buildPatchPayload = useCallback(
    (section: SectionKey): PatchVersionPayload => {
      if (section === 'brief') {
        return { brief: serializeBrief(brief ?? normalizeBrief(null)) }
      }
      if (section === 'hotspots') {
        return { hotspots: serializeHotspots(hotspots) }
      }
      return { dials: serializeDials(dials ?? normalizeDials(null)) }
    },
    [brief, dials, hotspots],
  )

  const saveSection = useCallback(
    async (section: SectionKey, reason: SaveReason): Promise<'saved' | 'skipped' | 'failed'> => {
      if (!versionId || !canEditRef.current) {
        return 'skipped'
      }

      if (!dirtySectionsRef.current[section]) {
        return 'skipped'
      }

      const validation = runSectionValidation(section)
      if (validation.sectionError || Object.keys(validation.fieldErrors).length > 0) {
        setValidationErrors(section, validation)
        return 'failed'
      }

      clearSectionErrors(section)

      try {
        await patchMutation.mutateAsync({
          versionId,
          patch: buildPatchPayload(section),
        })

        setDirtySections((prev) => ({ ...prev, [section]: false }))
        setServerFieldErrors((prev) => {
          const prefix = `${section}.`
          return Object.keys(prev).reduce<Record<string, string>>((acc, key) => {
            if (!key.startsWith(prefix)) {
              acc[key] = prev[key]
            }
            return acc
          }, {})
        })
        setServerSectionErrors((prev) => ({ ...prev, [section]: undefined }))
        return 'saved'
      } catch (error) {
        if (isApiError(error) && error.status === 409) {
          setForcedReadOnly(true)
          toast({
            variant: 'destructive',
            title: 'Version is read-only',
            description: 'Only draft versions are editable.',
          })
          return 'failed'
        }

        if (isApiError(error) && error.status === 422) {
          const parsed = parse422ValidationErrors(error)
          if (Object.keys(parsed.fieldErrors).length > 0) {
            setServerFieldErrors((prev) => ({ ...prev, ...parsed.fieldErrors }))
          }
          const targetSection = parsed.section ?? section
          if (parsed.sectionError) {
            setServerSectionErrors((prev) => ({ ...prev, [targetSection]: parsed.sectionError }))
          } else {
            setServerSectionErrors((prev) => ({
              ...prev,
              [targetSection]: getErrorMessage(error, 'Validation failed.'),
            }))
          }
        }

        toast({
          variant: 'destructive',
          title: 'Failed to save changes',
          description: getErrorMessage(error, 'Please try again.'),
          action:
            reason === 'unmount' ? undefined : (
              <ToastAction
                altText="Retry save"
                onClick={() => {
                  void saveDirtySectionsRef.current([section], 'manual')
                }}
              >
                Retry
              </ToastAction>
            ),
        })

        return 'failed'
      }
    },
    [buildPatchPayload, clearSectionErrors, patchMutation, runSectionValidation, setValidationErrors, versionId],
  )

  const saveDirtySections = useCallback(
    async (sections?: SectionKey[], reason: SaveReason = 'manual') => {
      if (isSavingRef.current || !canEditRef.current) {
        return { savedCount: 0, hadFailure: false }
      }

      const targets = (sections ?? SECTION_ORDER).filter((section) => dirtySectionsRef.current[section])
      if (targets.length === 0) {
        return { savedCount: 0, hadFailure: false }
      }

      setIsSaving(true)
      let savedCount = 0
      let hadFailure = false

      for (const section of targets) {
        const result = await saveSection(section, reason)
        if (result === 'saved') {
          savedCount += 1
        }
        if (result === 'failed') {
          hadFailure = true
        }
      }

      setIsSaving(false)

      if (reason === 'manual' && savedCount > 0 && !hadFailure) {
        toast({
          title: 'Saved',
          description: 'All changes are up to date.',
        })
      }

      return { savedCount, hadFailure }
    },
    [saveSection],
  )

  useEffect(() => {
    saveDirtySectionsRef.current = saveDirtySections
  }, [saveDirtySections])

  const canStartRun = Boolean(
    projectId &&
      versionId &&
      version &&
      version.state === 'draft' &&
      isStartRunReady &&
      !isRunActive &&
      !startRunMutation.isPending &&
      !isSaving,
  )

  const handleStartRun = useCallback(async () => {
    if (!projectId || !versionId || !version || !canStartRun) {
      return
    }

    const saveResult = await saveDirtySections(undefined, 'manual')
    if (saveResult.hadFailure) {
      return
    }

    try {
      await startRunMutation.mutateAsync({
        projectId,
        versionId,
        previousLatestRunId: latestRunId,
      })

      navigate(`/projects/${projectId}/versions/${versionId}/run`)
    } catch (error) {
      if (isApiError(error) && error.status === 422) {
        toast({
          variant: 'destructive',
          title: 'Cannot start run: brief is incomplete',
        })
        return
      }

      if (isApiError(error) && error.status === 409) {
        const detail = getErrorMessage(error, '').trim()
        toast({
          variant: 'destructive',
          title: detail
            ? `Cannot start run: ${detail}`
            : 'Cannot start run: a run is already in progress',
        })
        return
      }

      toast({
        variant: 'destructive',
        title: 'Failed to start run',
        description: getErrorMessage(error, 'Please try again.'),
      })
    }
  }, [
    canStartRun,
    latestRunId,
    navigate,
    projectId,
    saveDirtySections,
    startRunMutation,
    version,
    versionId,
  ])

  useEffect(() => {
    if (!canEdit || !hasDirty || !lastEditAt) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void saveDirtySections(undefined, 'autosave')
    }, 1500)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [canEdit, hasDirty, lastEditAt, saveDirtySections])

  useEffect(() => {
    if (!hasDirty) {
      return
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasDirty])

  useEffect(() => {
    return () => {
      if (dirtySectionsRef.current.brief || dirtySectionsRef.current.hotspots || dirtySectionsRef.current.dials) {
        if (canEditRef.current) {
          void saveDirtySectionsRef.current(undefined, 'unmount')
        }
      }
    }
  }, [])

  const onSectionBlur = useCallback(
    (section: SectionKey) => (event: React.FocusEvent<HTMLDivElement>) => {
      if (!canEdit) {
        return
      }
      const relatedTarget = event.relatedTarget as Node | null
      if (relatedTarget && event.currentTarget.contains(relatedTarget)) {
        return
      }

      const validation = runSectionValidation(section)
      setValidationErrors(section, validation)
      if (dirtySectionsRef.current[section]) {
        void saveDirtySections([section], 'blur')
      }
    },
    [canEdit, runSectionValidation, saveDirtySections, setValidationErrors],
  )

  const handleTagInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!brief || !canEdit) {
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const trimmed = noGoWordInput.trim()
      if (!trimmed || brief.no_go_words.includes(trimmed)) {
        setNoGoWordInput('')
        return
      }
      if (trimmed.length > 100) {
        setClientFieldErrors((prev) => ({
          ...prev,
          [`brief.no_go_words.${brief.no_go_words.length}`]: 'No-go words must be 100 characters or less.',
        }))
        return
      }
      setBrief({
        ...brief,
        no_go_words: [...brief.no_go_words, trimmed],
      })
      markDirty('brief')
      clearSectionErrors('brief')
      setNoGoWordInput('')
      return
    }

    if (event.key === 'Backspace' && !noGoWordInput.trim() && brief.no_go_words.length > 0) {
      event.preventDefault()
      setBrief({
        ...brief,
        no_go_words: brief.no_go_words.slice(0, -1),
      })
      markDirty('brief')
      clearSectionErrors('brief')
    }
  }

  if (!projectId || !versionId) {
    return (
      <section className="space-y-4">
        <Breadcrumbs items={[{ label: 'Projects', to: '/projects' }, { label: 'Version Builder' }]} />
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Project or version identifier is missing.
          </CardContent>
        </Card>
      </section>
    )
  }

  if (versionQuery.isLoading || !version || !brief || !dials) {
    return (
      <section className="space-y-4">
        <Breadcrumbs
          items={[
            { label: 'Projects', to: '/projects' },
            { label: breadcrumbProjectLabel, to: `/projects/${projectId}` },
            { label: versionLabel },
          ]}
        />
        <div className="lg:hidden">
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              Best viewed on desktop.
            </CardContent>
          </Card>
        </div>
        <BuilderSkeleton />
      </section>
    )
  }

  if (versionQuery.isError) {
    return (
      <section className="space-y-4">
        <Breadcrumbs
          items={[
            { label: 'Projects', to: '/projects' },
            { label: breadcrumbProjectLabel, to: `/projects/${projectId}` },
            { label: versionLabel },
          ]}
        />
        <Card>
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm text-muted-foreground">
              {getErrorMessage(versionQuery.error, 'Unable to load this version.')}
            </p>
            <Button onClick={() => void versionQuery.refetch()} type="button" variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      </section>
    )
  }

  const readOnly = !canEdit

  return (
    <section className="space-y-4">
      <Breadcrumbs
        items={[
          { label: 'Projects', to: '/projects' },
          { label: breadcrumbProjectLabel, to: `/projects/${projectId}` },
          { label: `v${version.version_number}` },
        ]}
      />

      <div className="lg:hidden">
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Best viewed on desktop.
          </CardContent>
        </Card>
      </div>

      <div className="hidden space-y-4 lg:block">
        <Card className="sticky top-14 z-20 border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{`v${version.version_number}`}</h1>
              <VersionStateBadge state={version.state} />
              {readOnly ? (
                <span className="text-sm text-muted-foreground">
                  This version is read-only. Only draft versions are editable.
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button
                disabled={readOnly || !hasDirty || isSaving}
                onClick={() => void saveDirtySections(undefined, 'manual')}
                type="button"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button disabled={!canStartRun} onClick={() => void handleStartRun()} type="button" variant="outline">
                {isRunActive ? 'Running...' : startRunMutation.isPending ? 'Starting...' : 'Start Run'}
              </Button>
              {isRunActive ? (
                <Button asChild type="button" variant="link">
                  <Link to={`/projects/${projectId}/versions/${versionId}/run`}>View Run Monitor</Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card onBlurCapture={onSectionBlur('brief')}>
          <CardHeader>
            <SectionHeader
              expanded={!collapsedSections.brief}
              onToggle={() =>
                setCollapsedSections((prev) => ({ ...prev, brief: !prev.brief }))
              }
              title="Brief"
            />
          </CardHeader>
          {!collapsedSections.brief ? (
            <CardContent className="space-y-8">
              <section className="space-y-4">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Product</h4>
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="brief-what-it-is">
                    What it is
                  </label>
                  <Input
                    disabled={readOnly}
                    id="brief-what-it-is"
                    maxLength={200}
                    onChange={(event) => {
                      setBrief((prev) => (prev ? { ...prev, what_it_is: event.target.value } : prev))
                      markDirty('brief')
                      clearSectionErrors('brief')
                      clearFieldError('brief.what_it_is')
                    }}
                    value={brief.what_it_is}
                  />
                  {getFieldError('brief.what_it_is') ? (
                    <p className="text-xs text-destructive">{getFieldError('brief.what_it_is')}</p>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="brief-description">
                    Description
                  </label>
                  <Textarea
                    disabled={readOnly}
                    id="brief-description"
                    maxLength={2000}
                    onChange={(event) => {
                      setBrief((prev) => (prev ? { ...prev, description: event.target.value } : prev))
                      markDirty('brief')
                      clearSectionErrors('brief')
                      clearFieldError('brief.description')
                    }}
                    rows={4}
                    value={brief.description}
                  />
                  {getFieldError('brief.description') ? (
                    <p className="text-xs text-destructive">{getFieldError('brief.description')}</p>
                  ) : null}
                </div>
              </section>

              <section className="space-y-4">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Audience</h4>
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="brief-target-market">
                    Target market
                  </label>
                  <Textarea
                    disabled={readOnly}
                    id="brief-target-market"
                    maxLength={1000}
                    onChange={(event) => {
                      setBrief((prev) => (prev ? { ...prev, target_market: event.target.value } : prev))
                      markDirty('brief')
                      clearSectionErrors('brief')
                      clearFieldError('brief.target_market')
                    }}
                    rows={3}
                    value={brief.target_market}
                  />
                  {getFieldError('brief.target_market') ? (
                    <p className="text-xs text-destructive">{getFieldError('brief.target_market')}</p>
                  ) : null}
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="brief-audience-context">
                    Audience context
                  </label>
                  <Textarea
                    disabled={readOnly}
                    id="brief-audience-context"
                    maxLength={1000}
                    onChange={(event) => {
                      setBrief((prev) => (prev ? { ...prev, audience_context: event.target.value } : prev))
                      markDirty('brief')
                      clearSectionErrors('brief')
                      clearFieldError('brief.audience_context')
                    }}
                    rows={3}
                    value={brief.audience_context}
                  />
                  {getFieldError('brief.audience_context') ? (
                    <p className="text-xs text-destructive">{getFieldError('brief.audience_context')}</p>
                  ) : null}
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Price tier</p>
                    <RadioGroup
                      className="grid grid-cols-3 gap-2"
                      disabled={readOnly}
                      onValueChange={(value) => {
                        setBrief((prev) =>
                          prev && PRICE_TIERS.includes(value as PriceTier)
                            ? { ...prev, price_tier: value as PriceTier }
                            : prev,
                        )
                        markDirty('brief')
                        clearSectionErrors('brief')
                        clearFieldError('brief.price_tier')
                      }}
                      value={brief.price_tier}
                    >
                      {PRICE_TIERS.map((tier) => (
                        <label
                          className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
                          key={tier}
                        >
                          <RadioGroupItem value={tier} />
                          <span className="capitalize">{tier}</span>
                        </label>
                      ))}
                    </RadioGroup>
                    {getFieldError('brief.price_tier') ? (
                      <p className="text-xs text-destructive">{getFieldError('brief.price_tier')}</p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Channel</p>
                    <RadioGroup
                      className="grid grid-cols-2 gap-2"
                      disabled={readOnly}
                      onValueChange={(value) => {
                        setBrief((prev) =>
                          prev && CHANNELS.includes(value as Channel)
                            ? { ...prev, channel: value as Channel }
                            : prev,
                        )
                        markDirty('brief')
                        clearSectionErrors('brief')
                        clearFieldError('brief.channel')
                      }}
                      value={brief.channel}
                    >
                      {CHANNELS.map((channel) => (
                        <label
                          className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
                          key={channel}
                        >
                          <RadioGroupItem value={channel} />
                          <span className="uppercase">{channel}</span>
                        </label>
                      ))}
                    </RadioGroup>
                    {getFieldError('brief.channel') ? (
                      <p className="text-xs text-destructive">{getFieldError('brief.channel')}</p>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {[
                    ['playful_serious', 'Playful / Serious'] as const,
                    ['modern_heritage', 'Modern / Heritage'] as const,
                    ['mass_premium', 'Mass / Premium'] as const,
                    ['bold_calm', 'Bold / Calm'] as const,
                  ].map(([key, label]) => (
                    <div className="space-y-2" key={key}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{label}</p>
                        <span className="text-xs text-muted-foreground">{brief[key]}</span>
                      </div>
                      <Slider
                        disabled={readOnly}
                        max={5}
                        min={1}
                        onValueChange={(value) => {
                          const nextValue = value[0] ?? 3
                          setBrief((prev) => (prev ? { ...prev, [key]: nextValue } : prev))
                          markDirty('brief')
                          clearSectionErrors('brief')
                          clearFieldError(`brief.${key}`)
                        }}
                        step={1}
                        value={[brief[key]]}
                      />
                      {getFieldError(`brief.${key}`) ? (
                        <p className="text-xs text-destructive">{getFieldError(`brief.${key}`)}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Differentiation
                  </h4>
                  <Button
                    disabled={readOnly || brief.differentiators.length >= 7}
                    onClick={() => {
                      setBrief((prev) =>
                        prev ? { ...prev, differentiators: [...prev.differentiators, ''] } : prev,
                      )
                      markDirty('brief')
                      clearSectionErrors('brief')
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Add item
                  </Button>
                </div>
                <div className="space-y-2">
                  {brief.differentiators.map((item, index) => (
                    <div className="grid grid-cols-[1fr_auto] gap-2" key={`differentiator-${index}`}>
                      <div className="space-y-1">
                        <Input
                          disabled={readOnly}
                          maxLength={500}
                          onChange={(event) => {
                            setBrief((prev) => {
                              if (!prev) {
                                return prev
                              }
                              const nextItems = [...prev.differentiators]
                              nextItems[index] = event.target.value
                              return { ...prev, differentiators: nextItems }
                            })
                            markDirty('brief')
                            clearSectionErrors('brief')
                            clearFieldError(`brief.differentiators.${index}`)
                          }}
                          placeholder={`Differentiator ${index + 1}`}
                          value={item}
                        />
                        {getFieldError(`brief.differentiators.${index}`) ? (
                          <p className="text-xs text-destructive">
                            {getFieldError(`brief.differentiators.${index}`)}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          disabled={readOnly || index === 0}
                          onClick={() => {
                            setBrief((prev) => {
                              if (!prev || index === 0) {
                                return prev
                              }
                              const nextItems = [...prev.differentiators]
                              ;[nextItems[index - 1], nextItems[index]] = [
                                nextItems[index],
                                nextItems[index - 1],
                              ]
                              return { ...prev, differentiators: nextItems }
                            })
                            markDirty('brief')
                          }}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Up
                        </Button>
                        <Button
                          disabled={readOnly || index === brief.differentiators.length - 1}
                          onClick={() => {
                            setBrief((prev) => {
                              if (!prev || index === prev.differentiators.length - 1) {
                                return prev
                              }
                              const nextItems = [...prev.differentiators]
                              ;[nextItems[index], nextItems[index + 1]] = [
                                nextItems[index + 1],
                                nextItems[index],
                              ]
                              return { ...prev, differentiators: nextItems }
                            })
                            markDirty('brief')
                          }}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Down
                        </Button>
                        <Button
                          disabled={readOnly || brief.differentiators.length <= 3}
                          onClick={() => {
                            setBrief((prev) => {
                              if (!prev || prev.differentiators.length <= 3) {
                                return prev
                              }
                              return {
                                ...prev,
                                differentiators: prev.differentiators.filter((_, idx) => idx !== index),
                              }
                            })
                            markDirty('brief')
                          }}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {getSectionError('brief') ? (
                  <p className="text-xs text-destructive">{getSectionError('brief')}</p>
                ) : null}
              </section>

              <section className="space-y-3">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Constraints
                </h4>
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="brief-no-go-word-input">
                    No-go words
                  </label>
                  <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
                    {brief.no_go_words.map((word, index) => (
                      <Badge className="gap-1" key={`${word}-${index}`} variant="secondary">
                        {word}
                        <button
                          aria-label={`Remove ${word}`}
                          className="rounded-sm px-1 text-xs"
                          disabled={readOnly}
                          onClick={() => {
                            setBrief((prev) =>
                              prev
                                ? { ...prev, no_go_words: prev.no_go_words.filter((item) => item !== word) }
                                : prev,
                            )
                            markDirty('brief')
                            clearSectionErrors('brief')
                          }}
                          type="button"
                        >
                          x
                        </button>
                      </Badge>
                    ))}
                    <Input
                      className="h-8 w-48 border-none p-0 shadow-none focus-visible:ring-0"
                      disabled={readOnly}
                      id="brief-no-go-word-input"
                      onChange={(event) => {
                        setNoGoWordInput(event.target.value)
                      }}
                      onKeyDown={handleTagInputKeyDown}
                      placeholder="Type and press Enter"
                      value={noGoWordInput}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium" htmlFor="brief-must-avoid-implying">
                    Must avoid implying
                  </label>
                  <Textarea
                    disabled={readOnly}
                    id="brief-must-avoid-implying"
                    maxLength={1000}
                    onChange={(event) => {
                      setBrief((prev) =>
                        prev ? { ...prev, must_avoid_implying: event.target.value } : prev,
                      )
                      markDirty('brief')
                      clearSectionErrors('brief')
                      clearFieldError('brief.must_avoid_implying')
                    }}
                    rows={3}
                    value={brief.must_avoid_implying}
                  />
                  {getFieldError('brief.must_avoid_implying') ? (
                    <p className="text-xs text-destructive">
                      {getFieldError('brief.must_avoid_implying')}
                    </p>
                  ) : null}
                </div>
              </section>
            </CardContent>
          ) : null}
        </Card>

        <Card onBlurCapture={onSectionBlur('hotspots')}>
          <CardHeader>
            <SectionHeader
              expanded={!collapsedSections.hotspots}
              onToggle={() =>
                setCollapsedSections((prev) => ({ ...prev, hotspots: !prev.hotspots }))
              }
              title="Creative Hotspots"
            />
          </CardHeader>
          {!collapsedSections.hotspots ? (
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">2 to 6 territories, ordered by priority.</p>
                <Button
                  disabled={readOnly || hotspots.length >= 6}
                  onClick={() => {
                    setHotspots((prev) => [...prev, createHotspotState()])
                    markDirty('hotspots')
                    clearSectionErrors('hotspots')
                  }}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Add Hotspot
                </Button>
              </div>

              <div className="space-y-3">
                {hotspots.map((hotspot, index) => (
                  <Card key={hotspot.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base">{`Hotspot ${index + 1}`}</CardTitle>
                        <div className="flex items-center gap-1">
                          <Button
                            disabled={readOnly || index === 0}
                            onClick={() => {
                              setHotspots((prev) => {
                                if (index === 0) {
                                  return prev
                                }
                                const next = [...prev]
                                ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
                                return next
                              })
                              markDirty('hotspots')
                            }}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Up
                          </Button>
                          <Button
                            disabled={readOnly || index === hotspots.length - 1}
                            onClick={() => {
                              setHotspots((prev) => {
                                if (index === prev.length - 1) {
                                  return prev
                                }
                                const next = [...prev]
                                ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
                                return next
                              })
                              markDirty('hotspots')
                            }}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Down
                          </Button>
                          <Button
                            disabled={readOnly || hotspots.length <= 2}
                            onClick={() => {
                              const hasContent =
                                hotspot.name.trim() || hotspot.paragraph.trim() || hotspot.weight.trim()
                              if (hasContent && !window.confirm('Delete this hotspot?')) {
                                return
                              }
                              setHotspots((prev) => prev.filter((item) => item.id !== hotspot.id))
                              markDirty('hotspots')
                              clearSectionErrors('hotspots')
                            }}
                            size="sm"
                            type="button"
                            variant="outline"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-sm font-medium" htmlFor={`hotspot-name-${hotspot.id}`}>
                          Name
                        </label>
                        <Input
                          disabled={readOnly}
                          id={`hotspot-name-${hotspot.id}`}
                          maxLength={200}
                          onChange={(event) => {
                            setHotspots((prev) =>
                              prev.map((item) =>
                                item.id === hotspot.id ? { ...item, name: event.target.value } : item,
                              ),
                            )
                            markDirty('hotspots')
                            clearSectionErrors('hotspots')
                            clearFieldError(`hotspots.${index}.name`)
                          }}
                          value={hotspot.name}
                        />
                        {getFieldError(`hotspots.${index}.name`) ? (
                          <p className="text-xs text-destructive">
                            {getFieldError(`hotspots.${index}.name`)}
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium" htmlFor={`hotspot-paragraph-${hotspot.id}`}>
                          Paragraph
                        </label>
                        <Textarea
                          disabled={readOnly}
                          id={`hotspot-paragraph-${hotspot.id}`}
                          maxLength={2000}
                          onChange={(event) => {
                            setHotspots((prev) =>
                              prev.map((item) =>
                                item.id === hotspot.id ? { ...item, paragraph: event.target.value } : item,
                              ),
                            )
                            markDirty('hotspots')
                            clearSectionErrors('hotspots')
                            clearFieldError(`hotspots.${index}.paragraph`)
                          }}
                          rows={4}
                          value={hotspot.paragraph}
                        />
                        {getFieldError(`hotspots.${index}.paragraph`) ? (
                          <p className="text-xs text-destructive">
                            {getFieldError(`hotspots.${index}.paragraph`)}
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium" htmlFor={`hotspot-weight-${hotspot.id}`}>
                          Weight
                        </label>
                        <Input
                          disabled={readOnly}
                          id={`hotspot-weight-${hotspot.id}`}
                          inputMode="numeric"
                          max={10}
                          min={1}
                          onChange={(event) => {
                            setHotspots((prev) =>
                              prev.map((item) =>
                                item.id === hotspot.id ? { ...item, weight: event.target.value } : item,
                              ),
                            )
                            markDirty('hotspots')
                            clearSectionErrors('hotspots')
                            clearFieldError(`hotspots.${index}.weight`)
                          }}
                          placeholder="Optional (1-10)"
                          type="number"
                          value={hotspot.weight}
                        />
                        <p className="text-xs text-muted-foreground">
                          Higher numbers = more names from this territory. Leave blank for equal weight.
                        </p>
                        {getFieldError(`hotspots.${index}.weight`) ? (
                          <p className="text-xs text-destructive">
                            {getFieldError(`hotspots.${index}.weight`)}
                          </p>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {getSectionError('hotspots') ? (
                <p className="text-xs text-destructive">{getSectionError('hotspots')}</p>
              ) : null}
            </CardContent>
          ) : null}
        </Card>

        <Card onBlurCapture={onSectionBlur('dials')}>
          <CardHeader>
            <SectionHeader
              expanded={!collapsedSections.dials}
              onToggle={() => setCollapsedSections((prev) => ({ ...prev, dials: !prev.dials }))}
              title="Naming Dials"
            />
          </CardHeader>
          {!collapsedSections.dials ? (
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm font-medium">Format mode</p>
                <RadioGroup
                  className="grid grid-cols-3 gap-2"
                  disabled={readOnly}
                  onValueChange={(value) => {
                    if (!FORMAT_MODES.includes(value as FormatMode)) {
                      return
                    }
                    setDials((prev) =>
                      prev ? { ...prev, format_mode: value as FormatMode } : prev,
                    )
                    markDirty('dials')
                    clearSectionErrors('dials')
                    clearFieldError('dials.format_mode')
                  }}
                  value={dials.format_mode}
                >
                  {FORMAT_MODES.map((mode) => (
                    <label
                      className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
                      key={mode}
                    >
                      <RadioGroupItem value={mode} />
                      <span>{mode.replace('_', ' ')}</span>
                    </label>
                  ))}
                </RadioGroup>
                {getFieldError('dials.format_mode') ? (
                  <p className="text-xs text-destructive">{getFieldError('dials.format_mode')}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Trademark posture</p>
                <RadioGroup
                  className="grid grid-cols-3 gap-2"
                  disabled={readOnly}
                  onValueChange={(value) => {
                    if (!TRADEMARK_POSTURES.includes(value as TrademarkPosture)) {
                      return
                    }
                    setDials((prev) =>
                      prev ? { ...prev, trademark_posture: value as TrademarkPosture } : prev,
                    )
                    markDirty('dials')
                    clearSectionErrors('dials')
                    clearFieldError('dials.trademark_posture')
                  }}
                  value={dials.trademark_posture}
                >
                  {TRADEMARK_POSTURES.map((posture) => (
                    <label
                      className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
                      key={posture}
                    >
                      <RadioGroupItem value={posture} />
                      <span className="capitalize">{posture}</span>
                    </label>
                  ))}
                </RadioGroup>
                {getFieldError('dials.trademark_posture') ? (
                  <p className="text-xs text-destructive">
                    {getFieldError('dials.trademark_posture')}
                  </p>
                ) : null}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Social checks</p>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {SOCIAL_CHECK_OPTIONS.map((option) => (
                    <label className="flex items-center gap-2 rounded-md border px-3 py-2" key={option}>
                      <Checkbox
                        checked={dials.social_checks.includes(option)}
                        disabled={readOnly}
                        onCheckedChange={(checked) => {
                          setDials((prev) => {
                            if (!prev) {
                              return prev
                            }
                            const isChecked = Boolean(checked)
                            const nextChecks = isChecked
                              ? [...prev.social_checks, option]
                              : prev.social_checks.filter((item) => item !== option)
                            return {
                              ...prev,
                              social_checks: nextChecks.filter(
                                (value, index, array) => array.indexOf(value) === index,
                              ),
                            }
                          })
                          markDirty('dials')
                          clearSectionErrors('dials')
                        }}
                      />
                      <span className="text-sm capitalize">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Card className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Domain checks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <p>Always on for MVP.</p>
                  <p className="font-medium text-foreground">Status: Enabled</p>
                </CardContent>
              </Card>

              <Card className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Run defaults (MVP)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <p>Names per run: 120</p>
                  <p>Shortlist size: 20</p>
                  <p>Mix: Broad exploration</p>
                </CardContent>
              </Card>

              {getSectionError('dials') ? (
                <p className="text-xs text-destructive">{getSectionError('dials')}</p>
              ) : null}
            </CardContent>
          ) : null}
        </Card>
      </div>
    </section>
  )
}
