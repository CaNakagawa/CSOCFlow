import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useInvestigationStore } from './investigationStore'
import { measuredNodeSizes } from '../../canvas/utils/nodeMeasures'
import { DEFAULT_SCORE_VIEW } from '../../canvas/utils/scoreView'
import type { InvestigationNode } from '../../../shared/types/investigation'
import type { KnowledgeBase } from '../../../shared/types/knowledge'

const knowledgeBase = {
  tactics: [{ id: 'TA0001', name: { en: 'Initial Access' }, shortName: 'initial-access' }],
  techniques: ['T1078', 'T1190', 'T1566'].map((id) => ({
    id,
    name: id,
    type: 'mitre_technique',
    tactics: ['TA0001'],
  })),
} as unknown as KnowledgeBase

function card(definitionId: string, navigatorScore: number): InvestigationNode {
  return {
    id: `n-${definitionId}`,
    definitionId,
    type: 'mitre_technique',
    label: definitionId,
    state: 'unknown',
    position: { x: 999, y: 999 },
    fields: {},
    navigatorScore,
    createdAt: '',
    updatedAt: '',
  }
}

beforeEach(() => {
  measuredNodeSizes.clear()
  useInvestigationStore.setState({
    nodes: [card('T1078', 16), card('T1190', 25), card('T1566', 2)],
    scoreView: DEFAULT_SCORE_VIEW,
    fitRequest: 0,
    past: [],
    future: [],
  })
})

const positionOf = (id: string) =>
  useInvestigationStore.getState().nodes.find((n) => n.id === `n-${id}`)!.position

describe('arrangeByScoreView', () => {
  it('stacks the column by score and asks the canvas to fit the result', () => {
    const { setScoreView, arrangeByScoreView } = useInvestigationStore.getState()
    setScoreView({ order: 'score', direction: 'desc' })
    arrangeByScoreView(knowledgeBase)

    expect(positionOf('T1190').y).toBeLessThan(positionOf('T1078').y)
    expect(positionOf('T1078').y).toBeLessThan(positionOf('T1566').y)
    expect(useInvestigationStore.getState().fitRequest).toBe(1)
  })

  it('leaves a card the range hides where it was, with no gap in the column', () => {
    const { setScoreView, arrangeByScoreView } = useInvestigationStore.getState()
    setScoreView({ order: 'score', direction: 'desc', min: 10 })
    arrangeByScoreView(knowledgeBase)

    expect(positionOf('T1566')).toEqual({ x: 999, y: 999 })
    expect(positionOf('T1078').y - positionOf('T1190').y).toBeGreaterThan(0)
  })

  it('packs the cards by their measured size when the spacing asks for it', () => {
    measuredNodeSizes.set('n-T1190', { width: 200, height: 100 })
    measuredNodeSizes.set('n-T1078', { width: 200, height: 100 })
    measuredNodeSizes.set('n-T1566', { width: 200, height: 100 })
    const { setScoreView, arrangeByScoreView } = useInvestigationStore.getState()
    setScoreView({ order: 'score', direction: 'desc', spacing: 'tight' })
    arrangeByScoreView(knowledgeBase)

    expect(positionOf('T1078').y - positionOf('T1190').y).toBe(104)
  })

  it('can be undone', () => {
    const { setScoreView, arrangeByScoreView, undo } = useInvestigationStore.getState()
    setScoreView({ order: 'score', direction: 'desc' })
    arrangeByScoreView(knowledgeBase)
    undo()

    expect(positionOf('T1190')).toEqual({ x: 999, y: 999 })
  })

  describe('scheduleArrange', () => {
    afterEach(() => vi.useRealTimers())

    it('waits, then arranges even if no card was measured again', () => {
      vi.useFakeTimers()
      const { setScoreView, scheduleArrange } = useInvestigationStore.getState()
      setScoreView({ order: 'score', direction: 'desc', spacing: 'compact' })
      scheduleArrange(knowledgeBase)

      expect(useInvestigationStore.getState().pendingArrange).toBe(true)
      expect(positionOf('T1190')).toEqual({ x: 999, y: 999 })

      vi.advanceTimersByTime(1500)
      expect(useInvestigationStore.getState().pendingArrange).toBe(false)
      expect(positionOf('T1190')).not.toEqual({ x: 999, y: 999 })
    })

    it('does nothing more when the canvas already arranged in the meantime', () => {
      vi.useFakeTimers()
      const { scheduleArrange } = useInvestigationStore.getState()
      scheduleArrange(knowledgeBase)
      useInvestigationStore.setState({ pendingArrange: false })

      vi.advanceTimersByTime(1500)
      expect(useInvestigationStore.getState().fitRequest).toBe(0)
    })
  })
})
