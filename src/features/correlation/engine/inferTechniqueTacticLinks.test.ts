import { describe, expect, it } from 'vitest'
import { inferTechniqueTacticLinks } from './inferTechniqueTacticLinks'
import type { InvestigationNode } from '../../../shared/types/investigation'
import type { MitreTechnique } from '../../../shared/types/knowledge'
import { isSourceHandleId, isTargetHandleId } from '../../../shared/types/handles'

function makeTechnique(
  partial: Pick<MitreTechnique, 'id' | 'tactics'> & Partial<MitreTechnique>,
): MitreTechnique {
  return {
    name: partial.id,
    type: 'mitre_technique',
    platforms: [],
    brief: { en: '' },
    expected_evidence: [],
    related_hypotheses: [],
    suggested_checks: [],
    detection_analytics: [],
    references: [],
    ...partial,
  }
}

function node(
  partial: Pick<InvestigationNode, 'id' | 'type' | 'definitionId'> & Partial<InvestigationNode>,
): InvestigationNode {
  return {
    label: partial.id,
    state: 'unknown',
    position: { x: 0, y: 0 },
    fields: {},
    notes: '',
    createdAt: '2026-07-30T00:00:00.000Z',
    updatedAt: '2026-07-30T00:00:00.000Z',
    ...partial,
  }
}

const bruteForce = makeTechnique({ id: 'T1110', tactics: ['TA0006'] })
const validAccounts = makeTechnique({ id: 'T1078', tactics: ['TA0003', 'TA0005'] })

describe('inferTechniqueTacticLinks', () => {
  it('links a technique to the tactic node it belongs to', () => {
    const nodes = [
      node({ id: 'tech-1', type: 'mitre_technique', definitionId: 'T1110' }),
      node({ id: 'tac-1', type: 'mitre_tactic', definitionId: 'TA0006' }),
    ]

    const edges = inferTechniqueTacticLinks(nodes, [bruteForce], 'en')

    expect(edges).toHaveLength(1)
    expect(edges[0].source).toBe('tech-1')
    expect(edges[0].target).toBe('tac-1')
    expect(edges[0].type).toBe('maps_to')
    expect(edges[0].automatic).toBe(true)
  })

  it('links one technique to every tactic of its own that is on the canvas', () => {
    const nodes = [
      node({ id: 'tech-1', type: 'mitre_technique', definitionId: 'T1078' }),
      node({ id: 'tac-1', type: 'mitre_tactic', definitionId: 'TA0003' }),
      node({ id: 'tac-2', type: 'mitre_tactic', definitionId: 'TA0005' }),
    ]

    const edges = inferTechniqueTacticLinks(nodes, [validAccounts], 'en')

    expect(edges.map((e) => e.target).sort()).toEqual(['tac-1', 'tac-2'])
  })

  it('ignores tactics that are not on the canvas', () => {
    const nodes = [
      node({ id: 'tech-1', type: 'mitre_technique', definitionId: 'T1078' }),
      node({ id: 'tac-1', type: 'mitre_tactic', definitionId: 'TA0003' }),
    ]

    const edges = inferTechniqueTacticLinks(nodes, [validAccounts], 'en')

    expect(edges).toHaveLength(1)
    expect(edges[0].target).toBe('tac-1')
  })

  it('links subtechniques as well as techniques', () => {
    const passwordGuessing = makeTechnique({
      id: 'T1110.001',
      tactics: ['TA0006'],
      type: 'mitre_subtechnique',
    })
    const nodes = [
      node({ id: 'sub-1', type: 'mitre_subtechnique', definitionId: 'T1110.001' }),
      node({ id: 'tac-1', type: 'mitre_tactic', definitionId: 'TA0006' }),
    ]

    expect(inferTechniqueTacticLinks(nodes, [passwordGuessing], 'en')).toHaveLength(1)
  })

  // React Flow silently drops an edge that names a target handle as its source,
  // which is exactly how this feature first shipped broken.
  it('only uses handle ids that exist on the right side of a node', () => {
    const nodes = [
      node({ id: 'tech-1', type: 'mitre_technique', definitionId: 'T1078' }),
      node({ id: 'tac-1', type: 'mitre_tactic', definitionId: 'TA0003' }),
    ]

    const edges = inferTechniqueTacticLinks(nodes, [validAccounts], 'en')

    expect(edges).not.toHaveLength(0)
    for (const edge of edges) {
      expect(isSourceHandleId(edge.sourceHandle)).toBe(true)
      expect(isTargetHandleId(edge.targetHandle)).toBe(true)
    }
  })

  it('produces no edges when there is no tactic on the canvas', () => {
    const nodes = [node({ id: 'tech-1', type: 'mitre_technique', definitionId: 'T1110' })]

    expect(inferTechniqueTacticLinks(nodes, [bruteForce], 'en')).toEqual([])
  })

  it('ignores unrelated tactic and technique pairs', () => {
    const nodes = [
      node({ id: 'tech-1', type: 'mitre_technique', definitionId: 'T1110' }),
      node({ id: 'tac-1', type: 'mitre_tactic', definitionId: 'TA0003' }),
    ]

    expect(inferTechniqueTacticLinks(nodes, [bruteForce], 'en')).toEqual([])
  })
})
