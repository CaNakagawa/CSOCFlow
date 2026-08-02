import { describe, expect, it } from 'vitest'
import { computeInvestigationScore, techniqueConfirmation } from './investigationScore'
import type {
  AnalyticStatus,
  InvestigationNode,
  NodeState,
} from '../../../shared/types/investigation'
import type {
  DetectionAnalytic,
  KnowledgeBase,
  MitreTechnique,
} from '../../../shared/types/knowledge'

/** The real matrix order, so the numbers below are the ones analysts will see. */
const TACTIC_IDS = [
  'TA0043',
  'TA0042',
  'TA0001',
  'TA0002',
  'TA0003',
  'TA0004',
  'TA0005',
  'TA0112',
  'TA0006',
  'TA0007',
  'TA0008',
  'TA0009',
  'TA0011',
  'TA0010',
  'TA0040',
]

function analytic(id: string): DetectionAnalytic {
  return {
    id,
    detectionStrategyId: 'DET0001',
    description: { en: id },
    url: `https://attack.mitre.org/detectionstrategies/DET0001#${id}`,
    platforms: [],
    logSources: [],
    mutableElements: [],
  }
}

function technique(id: string, tactics: string[], analyticIds: string[] = []): MitreTechnique {
  return {
    id,
    name: id,
    type: 'mitre_technique',
    tactics,
    platforms: [],
    brief: { en: '' },
    detection_analytics: analyticIds.map(analytic),
    expected_evidence: [],
    related_hypotheses: [],
    suggested_checks: [],
    references: [],
  }
}

function knowledgeBase(techniques: MitreTechnique[]): KnowledgeBase {
  return {
    version: '1.0.0',
    tactics: TACTIC_IDS.map((id, i) => ({ id, name: { en: id }, shortName: `t${i}` })),
    techniques,
    evidenceTypes: [],
    hypotheses: [],
    checks: [],
    useCases: [],
    relationshipRules: [],
  }
}

function node(
  id: string,
  definitionId: string,
  state: NodeState = 'unknown',
  analyticStatuses: Record<string, AnalyticStatus> = {},
): InvestigationNode {
  return {
    id,
    definitionId,
    type: 'mitre_technique',
    label: definitionId,
    state,
    position: { x: 0, y: 0 },
    fields: {},
    notes: '',
    analyticStatuses,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
  }
}

describe('techniqueConfirmation', () => {
  it('treats one confirmed analytic as confirming the technique', () => {
    // Analytics are alternative detections of the same behaviour, not a checklist.
    const n = node('n', 'T1', 'unknown', { AN1: 'confirmed' })
    expect(techniqueConfirmation(n, ['AN1', 'AN2', 'AN3', 'AN4', 'AN5', 'AN6'])).toBe(1)
  })

  it('does not water down that confirmation with the analytics left pending', () => {
    const one = node('a', 'T1', 'unknown', { AN1: 'confirmed' })
    const all = node('b', 'T1', 'unknown', { AN1: 'confirmed', AN2: 'confirmed' })
    expect(techniqueConfirmation(one, ['AN1', 'AN2'])).toBe(
      techniqueConfirmation(all, ['AN1', 'AN2']),
    )
  })

  it('reads zero when every analytic was ruled out', () => {
    const n = node('n', 'T1', 'suspicious', { AN1: 'not_confirmed', AN2: 'not_confirmed' })
    expect(techniqueConfirmation(n, ['AN1', 'AN2'])).toBe(0)
  })

  it('falls back to the node state while analytics are still undecided', () => {
    expect(techniqueConfirmation(node('n', 'T1', 'suspicious'), ['AN1'])).toBe(0.5)
    expect(techniqueConfirmation(node('n', 'T1', 'observed'), ['AN1'])).toBe(0.25)
    expect(techniqueConfirmation(node('n', 'T1', 'unknown'), ['AN1'])).toBe(0)
  })

  it('lets the analyst confirm a technique outright', () => {
    expect(techniqueConfirmation(node('n', 'T1', 'confirmed_malicious'), ['AN1'])).toBe(1)
  })

  it('discards what the analyst dismissed, even with a confirmed analytic', () => {
    const n = node('n', 'T1', 'false_positive', { AN1: 'confirmed' })
    expect(techniqueConfirmation(n, ['AN1'])).toBe(0)
  })
})

describe('computeInvestigationScore', () => {
  it('scores an empty canvas at zero', () => {
    expect(computeInvestigationScore([], knowledgeBase([])).score).toBe(0)
  })

  it('weights the same confirmation higher the further right it sits', () => {
    const kb = knowledgeBase([technique('T-recon', ['TA0043']), technique('T-impact', ['TA0040'])])

    const recon = computeInvestigationScore([node('n', 'T-recon', 'confirmed_malicious')], kb)
    const impact = computeInvestigationScore([node('n', 'T-impact', 'confirmed_malicious')], kb)

    expect(recon.score).toBe(7)
    expect(impact.score).toBe(56)
    expect(impact.score).toBeGreaterThan(recon.score)
  })

  it('reaches 100 only when the whole chain is confirmed', () => {
    const kb = knowledgeBase(TACTIC_IDS.map((id) => technique(`T-${id}`, [id])))
    const nodes = TACTIC_IDS.map((id) => node(`n-${id}`, `T-${id}`, 'confirmed_malicious'))

    const result = computeInvestigationScore(nodes, kb)

    expect(result.score).toBe(100)
    expect(result.depth).toBe(1)
    expect(result.breadth).toBe(1)
  })

  it('counts each confirmed technique in a tactic as its own activity', () => {
    const kb = knowledgeBase([
      technique('T-a', ['TA0003']),
      technique('T-b', ['TA0003']),
      technique('T-c', ['TA0003']),
    ])

    const one = computeInvestigationScore([node('n1', 'T-a', 'confirmed_malicious')], kb)
    const three = computeInvestigationScore(
      [
        node('n1', 'T-a', 'confirmed_malicious'),
        node('n2', 'T-b', 'confirmed_malicious'),
        node('n3', 'T-c', 'confirmed_malicious'),
      ],
      kb,
    )

    // three separate actions in Persistence outweigh one
    expect(three.score).toBeGreaterThan(one.score)
    expect(one.extraConfirmed).toBe(0)
    expect(three.extraConfirmed).toBeCloseTo(2)
  })

  it('does not move for techniques that were added but never decided', () => {
    const kb = knowledgeBase([technique('T-a', ['TA0003']), technique('T-b', ['TA0003'])])

    const confirmedOnly = computeInvestigationScore([node('n1', 'T-a', 'confirmed_malicious')], kb)
    const withUndecided = computeInvestigationScore(
      [node('n1', 'T-a', 'confirmed_malicious'), node('n2', 'T-b', 'unknown')],
      kb,
    )

    expect(withUndecided.score).toBe(confirmedOnly.score)
  })

  it('saturates the activity lift instead of letting volume run away', () => {
    const kb = knowledgeBase(Array.from({ length: 12 }, (_, i) => technique(`T-${i}`, ['TA0040'])))
    const nodes = Array.from({ length: 12 }, (_, i) =>
      node(`n${i}`, `T-${i}`, 'confirmed_malicious'),
    )

    const result = computeInvestigationScore(nodes, kb)

    expect(result.activity).toBeLessThan(1)
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('keeps the tactic reached at 1 while intensity keeps climbing', () => {
    const kb = knowledgeBase([technique('T-a', ['TA0003']), technique('T-b', ['TA0003'])])

    const result = computeInvestigationScore(
      [node('n1', 'T-a', 'confirmed_malicious'), node('n2', 'T-b', 'confirmed_malicious')],
      kb,
    )

    expect(result.tactics[0].confirmation).toBe(1)
    expect(result.tactics[0].intensity).toBe(2)
    expect(result.tactics[0].techniqueCount).toBe(2)
  })

  it('rises when the chain behind the deepest point gets confirmed', () => {
    const kb = knowledgeBase([
      technique('T-ia', ['TA0001']),
      technique('T-exec', ['TA0002']),
      technique('T-impact', ['TA0040']),
    ])

    const alone = computeInvestigationScore([node('n', 'T-impact', 'confirmed_malicious')], kb)
    const withChain = computeInvestigationScore(
      [
        node('n1', 'T-ia', 'confirmed_malicious'),
        node('n2', 'T-exec', 'confirmed_malicious'),
        node('n3', 'T-impact', 'confirmed_malicious'),
      ],
      kb,
    )

    expect(withChain.score).toBeGreaterThan(alone.score)
    expect(withChain.deepestTactic?.id).toBe('TA0040')
  })

  it('accumulates weaker signals within a tactic with diminishing returns', () => {
    const kb = knowledgeBase([technique('T-a', ['TA0040']), technique('T-b', ['TA0040'])])

    const single = computeInvestigationScore([node('n1', 'T-a', 'suspicious')], kb)
    const pair = computeInvestigationScore(
      [node('n1', 'T-a', 'suspicious'), node('n2', 'T-b', 'suspicious')],
      kb,
    )

    // two at 0.5 make 0.75, not 1.0
    expect(pair.tactics[0].confirmation).toBeCloseTo(0.75)
    expect(pair.score).toBeGreaterThan(single.score)
    expect(pair.score).toBeLessThan(100)
  })

  it('keeps coverage separate from the score', () => {
    const kb = knowledgeBase([technique('T-a', ['TA0040'], ['AN1', 'AN2', 'AN3', 'AN4'])])

    const barelyChecked = computeInvestigationScore(
      [node('n', 'T-a', 'unknown', { AN1: 'confirmed' })],
      kb,
    )
    const wellChecked = computeInvestigationScore(
      [
        node('n', 'T-a', 'unknown', {
          AN1: 'confirmed',
          AN2: 'not_confirmed',
          AN3: 'not_confirmed',
          AN4: 'not_confirmed',
        }),
      ],
      kb,
    )

    // same severity, very different confidence in it
    expect(wellChecked.score).toBe(barelyChecked.score)
    expect(barelyChecked.coverage).toBeCloseTo(0.25)
    expect(wellChecked.coverage).toBe(1)
  })

  it('ignores techniques the knowledge base does not know', () => {
    const result = computeInvestigationScore(
      [node('n', 'T-unknown', 'confirmed_malicious')],
      knowledgeBase([]),
    )
    expect(result.score).toBe(0)
    expect(result.totalTechniques).toBe(0)
  })

  it('reports the tactics present, in matrix order', () => {
    const kb = knowledgeBase([technique('T-a', ['TA0040']), technique('T-b', ['TA0001'])])

    const result = computeInvestigationScore(
      [node('n1', 'T-a', 'suspicious'), node('n2', 'T-b', 'suspicious')],
      kb,
    )

    expect(result.tactics.map((t) => t.tacticId)).toEqual(['TA0001', 'TA0040'])
  })

  it('counts confirmed techniques for the readout', () => {
    const kb = knowledgeBase([technique('T-a', ['TA0003']), technique('T-b', ['TA0003'])])

    const result = computeInvestigationScore(
      [node('n1', 'T-a', 'confirmed_malicious'), node('n2', 'T-b', 'suspicious')],
      kb,
    )

    expect(result.confirmedTechniques).toBe(1)
    expect(result.totalTechniques).toBe(2)
  })
})
