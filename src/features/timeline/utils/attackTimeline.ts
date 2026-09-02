import type { InvestigationNode } from '../../../shared/types/investigation'

/** One moment of the attack, with everything the analyst put in it. */
export interface TimelineStep {
  /** What the analyst numbered it: 1 for first, 2 for second. */
  step: number
  entries: InvestigationNode[]
}

export interface AttackTimeline {
  steps: TimelineStep[]
  /** On the canvas but not yet placed in the story. */
  unplaced: InvestigationNode[]
}

/* Scaffolding and decoration are not events; they hold the board together. */
const NOT_AN_EVENT = new Set(['text', 'whiteboard', 'drawing', 'image', 'group', 'mitre_tactic'])

export function canJoinTimeline(node: InvestigationNode): boolean {
  return !node.scaffold && !NOT_AN_EVENT.has(node.type)
}

/**
 * Arranges the canvas into the sequence the analyst numbered.
 *
 * Steps come out in order and closed up: numbering things 1, 2 and 7 gives
 * three columns, not seven, because the gaps say nothing to whoever is reading
 * it. Several elements sharing a number stack in one column, which is how
 * "these happened together" is shown.
 */
export function buildAttackTimeline(nodes: InvestigationNode[]): AttackTimeline {
  const byStep = new Map<number, InvestigationNode[]>()
  const unplaced: InvestigationNode[] = []

  for (const node of nodes) {
    if (!canJoinTimeline(node)) continue
    if (node.step === undefined) {
      unplaced.push(node)
      continue
    }
    const entries = byStep.get(node.step) ?? []
    entries.push(node)
    byStep.set(node.step, entries)
  }

  const steps = [...byStep.entries()]
    .sort(([a], [b]) => a - b)
    .map(([step, entries]) => ({
      step,
      // Within a step, the ones with a time told first, in that order.
      entries: [...entries].sort((a, b) => {
        const timeA = a.eventAt?.trim() ?? ''
        const timeB = b.eventAt?.trim() ?? ''
        if (timeA && timeB) return timeA.localeCompare(timeB, undefined, { numeric: true })
        if (timeA) return -1
        if (timeB) return 1
        return a.label.localeCompare(b.label)
      }),
    }))

  return { steps, unplaced }
}

/**
 * The number a new element should take to land at the end of the story.
 *
 * Numbering from the highest rather than from the count means adding to a
 * timeline that already skips numbers does not collide with what is there.
 */
export function nextStep(nodes: InvestigationNode[]): number {
  const highest = nodes.reduce((max, node) => Math.max(max, node.step ?? 0), 0)
  return highest + 1
}

/**
 * A time the analyst typed, turned into something comparable.
 *
 * `kind` matters as much as the number: a clock time and a full date live on
 * different scales, and comparing "09:15" against "2026-03-14 08:00" would
 * invent an ordering that is not there. Anything that is not one of the two
 * shapes — "around midday", "before the backup" — comes back null and is left
 * alone, because prose in this field is a deliberate choice, not a mistake.
 */
export interface ParsedTime {
  kind: 'clock' | 'date'
  value: number
}

const CLOCK = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/
const DATE_TIME = /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?/

export function parseEventTime(raw: string | undefined): ParsedTime | null {
  const text = raw?.trim()
  if (!text) return null

  const clock = CLOCK.exec(text)
  if (clock) {
    const hours = Number(clock[1])
    const minutes = Number(clock[2])
    const seconds = Number(clock[3] ?? '0')
    if (hours > 23 || minutes > 59 || seconds > 59) return null
    return { kind: 'clock', value: hours * 3600 + minutes * 60 + seconds }
  }

  if (DATE_TIME.test(text)) {
    const parsed = Date.parse(text.replace(' ', 'T'))
    if (!Number.isNaN(parsed)) return { kind: 'date', value: parsed }
  }

  return null
}

/**
 * The elements whose time runs backwards.
 *
 * Reading the timeline in order, each time must be at or after the one before
 * it; anything earlier is either a typo or a step in the wrong place, and
 * either way the analyst wants to know before a director does. Only times of
 * the same shape are compared, and an unreadable one neither complains nor
 * resets the comparison — it is simply skipped.
 */
export function findTimeConflicts(steps: TimelineStep[]): Set<string> {
  const conflicts = new Set<string>()
  const latest: Partial<Record<ParsedTime['kind'], number>> = {}

  for (const step of steps) {
    for (const node of step.entries) {
      const time = parseEventTime(node.eventAt)
      if (!time) continue

      const previous = latest[time.kind]
      if (previous !== undefined && time.value < previous) {
        conflicts.add(node.id)
        continue
      }
      latest[time.kind] = time.value
    }
  }

  return conflicts
}
