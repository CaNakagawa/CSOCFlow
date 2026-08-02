import type { InvestigationNode } from '../../../shared/types/investigation'
import type { KnowledgeBase, MitreTactic } from '../../../shared/types/knowledge'
import type { LocalizedText } from '../../../shared/i18n/types'

/** Reaching a tactic at all already counts for half; the rest is the chain behind it. */
const DEPTH_FLOOR = 0.5

/** How much confirmed activity beyond one technique per tactic can lift the score. */
const ACTIVITY_GAIN = 0.15
/** Extra confirmed techniques needed for half the available lift. */
const ACTIVITY_SCALE = 3

/** Confidence when only the node state speaks, with no analytic decided either way. */
const STATE_CONFIRMATION: Partial<Record<InvestigationNode['state'], number>> = {
  confirmed_malicious: 1,
  suspicious: 0.5,
  observed: 0.25,
}

export interface TacticScore {
  tacticId: string
  name: LocalizedText
  /** 0-based position in the matrix. */
  position: number
  /** How much this tactic counts, growing left to right. */
  weight: number
  /** 0..1, how confirmed the tactic is — whether the adversary got here at all. */
  confirmation: number
  /** Confirmed techniques summed, counting each as its own activity. Can exceed 1. */
  intensity: number
  /** Technique nodes mapped to this tactic, confirmed or not. */
  techniqueCount: number
}

export interface InvestigationScore {
  /** 0..100 headline. */
  score: number
  /** Weight of the furthest confirmed tactic, 0..1. */
  depth: number
  /** How much of the chain up to that point is confirmed, 0..1. */
  breadth: number
  /** Confirmed activity beyond the first technique of each tactic, 0..1 saturating. */
  activity: number
  /** Raw count behind `activity`. */
  extraConfirmed: number
  /** Analytics actually decided, confirmed or ruled out, over all analytics present. */
  coverage: number
  deepestTactic: MitreTactic | null
  /** Tactics present on the canvas, in matrix order. */
  tactics: TacticScore[]
  confirmedTechniques: number
  totalTechniques: number
}

export type ScoreBand = 'low' | 'moderate' | 'high' | 'critical'

/** Severity band behind the colour every score readout uses. */
export function scoreBand(score: number): ScoreBand {
  if (score >= 70) return 'critical'
  if (score >= 40) return 'high'
  if (score >= 15) return 'moderate'
  return 'low'
}

function isTechniqueNode(node: InvestigationNode): boolean {
  return node.type === 'mitre_technique' || node.type === 'mitre_subtechnique'
}

/**
 * How confirmed a single technique is, 0..1.
 *
 * Detection analytics are alternative ways to observe the same technique on
 * different telemetry, not requirements to satisfy together. One confirmed
 * analytic therefore confirms the technique outright; the others are
 * corroboration, and they are counted separately as coverage rather than
 * dragging the value down.
 */
export function techniqueConfirmation(node: InvestigationNode, analyticIds: string[]): number {
  if (node.state === 'false_positive' || node.state === 'discarded') return 0
  if (node.state === 'confirmed_malicious') return 1

  const statuses = analyticIds.map((id) => node.analyticStatuses?.[id] ?? 'pending')
  if (statuses.some((s) => s === 'confirmed')) return 1
  if (statuses.length > 0 && statuses.every((s) => s === 'not_confirmed')) return 0

  return STATE_CONFIRMATION[node.state] ?? 0
}

/**
 * Scores an investigation by how far along the kill chain confirmed activity
 * reaches, and how much of the path behind it is confirmed too.
 *
 * Three axes feed it:
 *
 * - depth dominates. A confirmed tactic far to the right sets the ceiling, so a
 *   deep compromise never scores low merely because the earlier steps have not
 *   been mapped yet.
 * - breadth modulates within that ceiling: how much of the chain leading there
 *   is confirmed.
 * - activity lifts it further. Each confirmed technique counts as its own
 *   action in the environment, so two confirmed techniques in one tactic beat
 *   one. The lift saturates and the total is capped, so thorough documentation
 *   cannot run away with the number.
 *
 * Only *confirmed* techniques move any of this. Adding nodes without deciding
 * them changes nothing.
 */
export function computeInvestigationScore(
  nodes: InvestigationNode[],
  knowledgeBase: KnowledgeBase | null,
): InvestigationScore {
  const empty: InvestigationScore = {
    score: 0,
    depth: 0,
    breadth: 0,
    activity: 0,
    extraConfirmed: 0,
    coverage: 0,
    deepestTactic: null,
    tactics: [],
    confirmedTechniques: 0,
    totalTechniques: 0,
  }
  if (!knowledgeBase) return empty

  const techniquesById = new Map(knowledgeBase.techniques.map((t) => [t.id, t]))
  const positionOf = new Map(knowledgeBase.tactics.map((t, index) => [t.id, index]))
  const total = knowledgeBase.tactics.length
  if (total === 0) return empty

  // Confirmation of every technique on the canvas, plus analytic coverage.
  const confirmationByTactic = new Map<string, number[]>()
  let decidedAnalytics = 0
  let totalAnalytics = 0
  let confirmedTechniques = 0
  let totalTechniques = 0

  for (const node of nodes) {
    if (!isTechniqueNode(node)) continue
    const definition = techniquesById.get(node.definitionId)
    if (!definition) continue

    totalTechniques += 1
    const analyticIds = definition.detection_analytics.map((a) => a.id)
    const confirmation = techniqueConfirmation(node, analyticIds)
    if (confirmation >= 1) confirmedTechniques += 1

    for (const id of analyticIds) {
      totalAnalytics += 1
      const status = node.analyticStatuses?.[id] ?? 'pending'
      if (status !== 'pending') decidedAnalytics += 1
    }

    for (const tacticId of definition.tactics) {
      if (!positionOf.has(tacticId)) continue
      const bucket = confirmationByTactic.get(tacticId) ?? []
      bucket.push(confirmation)
      confirmationByTactic.set(tacticId, bucket)
    }
  }

  const tactics: TacticScore[] = knowledgeBase.tactics
    .map((tactic, position) => {
      const values = confirmationByTactic.get(tactic.id)
      if (!values) return null
      return {
        tacticId: tactic.id,
        name: tactic.name,
        position,
        weight: (position + 1) / total,
        // Whether the adversary reached this tactic at all. Saturates, because
        // a tactic cannot be more than reached; this drives depth and breadth.
        confirmation: 1 - values.reduce((acc, value) => acc * (1 - value), 1),
        // Separate axis: each confirmed technique is its own activity in the
        // environment, so these add rather than collapsing into one another.
        intensity: values.reduce((sum, value) => sum + value, 0),
        techniqueCount: values.length,
      }
    })
    .filter((entry): entry is TacticScore => entry !== null)

  const coverage = totalAnalytics === 0 ? 0 : decidedAnalytics / totalAnalytics

  const reached = tactics.filter((t) => t.confirmation > 0)
  if (reached.length === 0) {
    return { ...empty, coverage, tactics, totalTechniques }
  }

  const deepest = reached.reduce((best, t) => (t.position > best.position ? t : best))
  const depth = deepest.weight

  // Everything the adversary would have had to pass through to get this far.
  let achieved = 0
  let available = 0
  for (let position = 0; position <= deepest.position; position += 1) {
    const weight = (position + 1) / total
    available += weight
    const tactic = tactics.find((t) => t.position === position)
    if (tactic) achieved += weight * tactic.confirmation
  }
  const breadth = available === 0 ? 0 : achieved / available

  // Confirmed activity beyond the first technique of each tactic. A second
  // confirmed technique in Persistence is a second thing the adversary did, not
  // a restatement of the first, so it lifts the score.
  const extraConfirmed = tactics.reduce(
    (sum, tactic) => sum + Math.max(0, tactic.intensity - tactic.confirmation),
    0,
  )
  const activity = 1 - 1 / (1 + extraConfirmed / ACTIVITY_SCALE)

  const structural = depth * (DEPTH_FLOOR + (1 - DEPTH_FLOOR) * breadth)

  return {
    score: Math.min(100, Math.round(100 * structural * (1 + ACTIVITY_GAIN * activity))),
    depth,
    breadth,
    activity,
    extraConfirmed,
    coverage,
    deepestTactic: knowledgeBase.tactics[deepest.position] ?? null,
    tactics,
    confirmedTechniques,
    totalTechniques,
  }
}
