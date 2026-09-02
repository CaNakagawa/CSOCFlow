import { describe, expect, it } from 'vitest'
import {
  buildAttackTimeline,
  canJoinTimeline,
  findTimeConflicts,
  nextStep,
  parseEventTime,
} from './attackTimeline'
import type { CanvasNodeType, InvestigationNode } from '../../../shared/types/investigation'

function node(partial: Partial<InvestigationNode> & { id: string }): InvestigationNode {
  return {
    definitionId: 'T1110',
    type: 'mitre_technique' as CanvasNodeType,
    label: partial.id,
    state: 'unknown',
    position: { x: 0, y: 0 },
    fields: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

describe('buildAttackTimeline', () => {
  it('puts the steps in the order the analyst numbered them', () => {
    const timeline = buildAttackTimeline([
      node({ id: 'c', step: 3 }),
      node({ id: 'a', step: 1 }),
      node({ id: 'b', step: 2 }),
    ])

    expect(timeline.steps.map((s) => s.step)).toEqual([1, 2, 3])
    expect(timeline.steps.map((s) => s.entries[0].id)).toEqual(['a', 'b', 'c'])
  })

  it('stacks everything that shares a number into one column', () => {
    const timeline = buildAttackTimeline([
      node({ id: 'a', step: 1 }),
      node({ id: 'b', step: 2 }),
      node({ id: 'c', step: 2 }),
      node({ id: 'd', step: 2 }),
    ])

    expect(timeline.steps).toHaveLength(2)
    expect(timeline.steps[1].entries.map((e) => e.id)).toEqual(['b', 'c', 'd'])
  })

  it('closes up the gaps, since a missing number says nothing', () => {
    const timeline = buildAttackTimeline([node({ id: 'a', step: 1 }), node({ id: 'b', step: 7 })])

    expect(timeline.steps.map((s) => s.step)).toEqual([1, 7])
    expect(timeline.steps).toHaveLength(2)
  })

  it('orders a shared step by the time of each event', () => {
    const timeline = buildAttackTimeline([
      node({ id: 'late', step: 1, eventAt: '10:42' }),
      node({ id: 'early', step: 1, eventAt: '09:15' }),
    ])

    expect(timeline.steps[0].entries.map((e) => e.id)).toEqual(['early', 'late'])
  })

  it('puts the ones with a time before the ones without', () => {
    const timeline = buildAttackTimeline([
      node({ id: 'untimed', step: 1 }),
      node({ id: 'timed', step: 1, eventAt: '23:00' }),
    ])

    expect(timeline.steps[0].entries.map((e) => e.id)).toEqual(['timed', 'untimed'])
  })

  it('holds back what is on the canvas but not in the story yet', () => {
    const timeline = buildAttackTimeline([node({ id: 'a', step: 1 }), node({ id: 'b' })])

    expect(timeline.steps[0].entries.map((e) => e.id)).toEqual(['a'])
    expect(timeline.unplaced.map((e) => e.id)).toEqual(['b'])
  })

  it('leaves out what is not an event', () => {
    const timeline = buildAttackTimeline([
      node({ id: 'note', type: 'text', step: 1 }),
      node({ id: 'board', type: 'whiteboard', step: 1 }),
      node({ id: 'ink', type: 'drawing', step: 1 }),
      node({ id: 'pic', type: 'image', step: 1 }),
      node({ id: 'box', type: 'group', step: 1 }),
      node({ id: 'tactic', type: 'mitre_tactic', step: 1 }),
      node({ id: 'frame', scaffold: true, step: 1 }),
      node({ id: 'real', step: 1 }),
    ])

    expect(timeline.steps[0].entries.map((e) => e.id)).toEqual(['real'])
    expect(timeline.unplaced).toEqual([])
  })

  it('has nothing to show for an empty canvas', () => {
    expect(buildAttackTimeline([])).toEqual({ steps: [], unplaced: [] })
  })
})

describe('canJoinTimeline', () => {
  it('accepts evidence and techniques', () => {
    expect(canJoinTimeline(node({ id: 'a', type: 'ip_address' }))).toBe(true)
    expect(canJoinTimeline(node({ id: 'b', type: 'mitre_subtechnique' }))).toBe(true)
  })

  it('refuses the furniture', () => {
    expect(canJoinTimeline(node({ id: 'c', type: 'text' }))).toBe(false)
    expect(canJoinTimeline(node({ id: 'd', scaffold: true }))).toBe(false)
  })
})

describe('nextStep', () => {
  it('follows the highest number, not the count', () => {
    expect(nextStep([node({ id: 'a', step: 1 }), node({ id: 'b', step: 7 })])).toBe(8)
  })

  it('starts the story at one', () => {
    expect(nextStep([node({ id: 'a' })])).toBe(1)
    expect(nextStep([])).toBe(1)
  })
})

describe('parseEventTime', () => {
  it('reads a clock time', () => {
    expect(parseEventTime('09:15')).toEqual({ kind: 'clock', value: 9 * 3600 + 15 * 60 })
    expect(parseEventTime('9:15')).toEqual({ kind: 'clock', value: 9 * 3600 + 15 * 60 })
    expect(parseEventTime('23:59:30')).toEqual({ kind: 'clock', value: 23 * 3600 + 59 * 60 + 30 })
  })

  it('reads a date with or without a time on it', () => {
    expect(parseEventTime('2026-03-14 09:15')?.kind).toBe('date')
    expect(parseEventTime('2026-03-14T09:15:00Z')?.kind).toBe('date')
    expect(parseEventTime('2026-03-14')?.kind).toBe('date')
  })

  it('leaves prose alone rather than guessing at it', () => {
    expect(parseEventTime('around midday')).toBeNull()
    expect(parseEventTime('before the backup')).toBeNull()
    expect(parseEventTime('')).toBeNull()
    expect(parseEventTime(undefined)).toBeNull()
  })

  it('refuses a clock that could not exist', () => {
    expect(parseEventTime('25:00')).toBeNull()
    expect(parseEventTime('10:75')).toBeNull()
  })
})

describe('findTimeConflicts', () => {
  const steps = (...groups: { id: string; eventAt?: string }[][]) =>
    groups.map((entries, index) => ({
      step: index + 1,
      entries: entries.map((entry) => node({ id: entry.id, eventAt: entry.eventAt })),
    }))

  it('is happy when time only moves forward', () => {
    const conflicts = findTimeConflicts(
      steps([{ id: 'a', eventAt: '09:15' }], [{ id: 'b', eventAt: '10:42' }]),
    )
    expect(conflicts.size).toBe(0)
  })

  it('accepts two events at the very same moment', () => {
    const conflicts = findTimeConflicts(
      steps([{ id: 'a', eventAt: '09:15' }], [{ id: 'b', eventAt: '09:15' }]),
    )
    expect(conflicts.size).toBe(0)
  })

  it('flags a later step that happened earlier', () => {
    const conflicts = findTimeConflicts(
      steps([{ id: 'a', eventAt: '10:42' }], [{ id: 'b', eventAt: '09:15' }]),
    )
    expect([...conflicts]).toEqual(['b'])
  })

  it('flags within a step as well as across steps', () => {
    const conflicts = findTimeConflicts(
      steps([
        { id: 'a', eventAt: '10:00' },
        { id: 'b', eventAt: '09:00' },
      ]),
    )
    expect([...conflicts]).toEqual(['b'])
  })

  it('does not compare a clock time against a full date', () => {
    const conflicts = findTimeConflicts(
      steps([{ id: 'a', eventAt: '2026-03-14 10:00' }], [{ id: 'b', eventAt: '09:15' }]),
    )
    expect(conflicts.size).toBe(0)
  })

  it('steps over what it cannot read without losing its place', () => {
    const conflicts = findTimeConflicts(
      steps(
        [{ id: 'a', eventAt: '10:00' }],
        [{ id: 'prose', eventAt: 'around midday' }],
        [{ id: 'c', eventAt: '09:00' }],
      ),
    )
    expect([...conflicts]).toEqual(['c'])
  })

  it('goes on comparing against the last good time, not the bad one', () => {
    const conflicts = findTimeConflicts(
      steps(
        [{ id: 'a', eventAt: '10:00' }],
        [{ id: 'bad', eventAt: '08:00' }],
        [{ id: 'c', eventAt: '09:00' }],
      ),
    )
    // 09:00 is still before 10:00, so it is wrong too.
    expect([...conflicts]).toEqual(['bad', 'c'])
  })
})
