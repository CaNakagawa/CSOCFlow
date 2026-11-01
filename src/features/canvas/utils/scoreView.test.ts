import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SCORE_VIEW,
  hasScoreRange,
  inScoreRange,
  isHiddenByScore,
  listForView,
  scoreVisibility,
  sortByScoreView,
  type ScoreView,
} from './scoreView'
import type { InvestigationNode } from '../../../shared/types/investigation'

function card(
  definitionId: string,
  navigatorScore?: number,
  type: InvestigationNode['type'] = 'mitre_technique',
): InvestigationNode {
  return {
    id: `n-${definitionId}`,
    definitionId,
    type,
    label: definitionId,
    state: 'unknown',
    position: { x: 0, y: 0 },
    fields: {},
    ...(navigatorScore !== undefined ? { navigatorScore } : {}),
    createdAt: '',
    updatedAt: '',
  }
}

const view = (patch: Partial<ScoreView>): ScoreView => ({ ...DEFAULT_SCORE_VIEW, ...patch })

describe('score range', () => {
  it('shows everything when no limit is set', () => {
    expect(hasScoreRange(DEFAULT_SCORE_VIEW)).toBe(false)
    expect(inScoreRange(0, DEFAULT_SCORE_VIEW)).toBe(true)
  })

  it('includes both ends of the range', () => {
    const v = view({ min: 5, max: 10 })
    expect([4, 5, 7, 10, 11].map((s) => inScoreRange(s, v))).toEqual([
      false,
      true,
      true,
      true,
      false,
    ])
  })

  it('works with only a lower or only an upper limit', () => {
    expect(inScoreRange(3, view({ min: 5 }))).toBe(false)
    expect(inScoreRange(300, view({ min: 5 }))).toBe(true)
    expect(inScoreRange(300, view({ max: 5 }))).toBe(false)
  })
})

describe('isHiddenByScore', () => {
  const v = view({ min: 5, max: 10 })

  it('hides a scored technique outside the range, and only when asked to', () => {
    expect(isHiddenByScore(card('T1', 2), v)).toBe(true)
    expect(isHiddenByScore(card('T1', 7), v)).toBe(false)
    expect(isHiddenByScore(card('T1', 2), view({ min: 5, max: 10, hideOutside: false }))).toBe(
      false,
    )
  })

  it('never hides a card that has no score to compare', () => {
    expect(isHiddenByScore(card('T1'), v)).toBe(false)
    expect(isHiddenByScore(card('TA0001', 2, 'mitre_tactic'), v)).toBe(false)
  })

  it('hides nothing without a range', () => {
    expect(isHiddenByScore(card('T1', 1), DEFAULT_SCORE_VIEW)).toBe(false)
  })
})

describe('sortByScoreView', () => {
  const cards = [card('T1059.001', 26), card('T1078', 16), card('T1003', 16), card('T1105', 25)]

  it('puts the highest score first, ties in matrix order', () => {
    const ids = sortByScoreView(cards, { order: 'score', direction: 'desc' }).map(
      (c) => c.definitionId,
    )
    expect(ids).toEqual(['T1059.001', 'T1105', 'T1003', 'T1078'])
  })

  it('puts the lowest score first when ascending', () => {
    const ids = sortByScoreView(cards, { order: 'score', direction: 'asc' }).map(
      (c) => c.definitionId,
    )
    expect(ids).toEqual(['T1003', 'T1078', 'T1105', 'T1059.001'])
  })

  it('keeps cards without a score at the end in either direction', () => {
    const mixed = [card('T1', undefined), card('T2', 3), card('T3', 9)]
    expect(
      sortByScoreView(mixed, { order: 'score', direction: 'desc' }).map((c) => c.definitionId),
    ).toEqual(['T3', 'T2', 'T1'])
    expect(
      sortByScoreView(mixed, { order: 'score', direction: 'asc' }).map((c) => c.definitionId),
    ).toEqual(['T2', 'T3', 'T1'])
  })

  it('orders by technique id the way MITRE numbers them', () => {
    const ids = sortByScoreView(cards, { order: 'technique', direction: 'asc' }).map(
      (c) => c.definitionId,
    )
    expect(ids).toEqual(['T1003', 'T1059.001', 'T1078', 'T1105'])
    const reversed = sortByScoreView(cards, { order: 'technique', direction: 'desc' }).map(
      (c) => c.definitionId,
    )
    expect(reversed).toEqual(['T1105', 'T1078', 'T1059.001', 'T1003'])
  })

  it('does not change the list it was given', () => {
    const before = cards.map((c) => c.definitionId)
    sortByScoreView(cards, { order: 'score', direction: 'desc' })
    expect(cards.map((c) => c.definitionId)).toEqual(before)
  })
})

describe('listForView', () => {
  const nodes = [
    card('T1', 1),
    card('T2', 5),
    card('T3', 12),
    card('T4'),
    card('TA0001', 9, 'mitre_tactic'),
  ]

  it('lists only scored techniques inside the range, in the view order', () => {
    const ids = listForView(nodes, view({ min: 2, order: 'score', direction: 'desc' })).map(
      (n) => n.definitionId,
    )
    expect(ids).toEqual(['T3', 'T2'])
  })

  it('lists every scored technique when there is no range', () => {
    expect(listForView(nodes, DEFAULT_SCORE_VIEW).map((n) => n.definitionId)).toEqual([
      'T1',
      'T2',
      'T3',
    ])
  })
})

describe('scoreVisibility', () => {
  const nodes = [
    card('T1059', 4),
    card('T1059.001', 26, 'mitre_subtechnique'),
    card('T1003', 3),
    card('T1003.001', 2, 'mitre_subtechnique'),
    card('T1053.005', 20, 'mitre_subtechnique'),
  ]
  const ids = (set: Set<string>) => [...set].sort()

  it('keeps a hidden parent as a faded card while its subtechnique is shown', () => {
    const { hidden, ghosts } = scoreVisibility(nodes, view({ min: 15 }))
    expect(ids(ghosts)).toEqual(['n-T1059'])
    expect(ids(hidden)).toEqual(['n-T1003', 'n-T1003.001'])
  })

  it('hides the parent too when the view says so', () => {
    const { hidden, ghosts } = scoreVisibility(nodes, view({ min: 15, showParents: false }))
    expect(ghosts.size).toBe(0)
    expect(hidden.has('n-T1059')).toBe(true)
  })

  it('does nothing without a range or when the cards are not being hidden', () => {
    expect(scoreVisibility(nodes, DEFAULT_SCORE_VIEW).hidden.size).toBe(0)
    expect(scoreVisibility(nodes, view({ min: 15, hideOutside: false })).ghosts.size).toBe(0)
  })
})
