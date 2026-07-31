import { describe, expect, it } from 'vitest'
import { buildSubtechniqueEdges, parentTechniqueId } from './buildSubtechniqueEdges'
import type { InvestigationNode } from '../../../shared/types/investigation'
import { isHandleId } from '../../../shared/types/handles'

function node(
  id: string,
  definitionId: string,
  type: InvestigationNode['type'] = 'mitre_technique',
): InvestigationNode {
  return {
    id,
    definitionId,
    type,
    label: definitionId,
    state: 'unknown',
    position: { x: 0, y: 0 },
    fields: {},
    notes: '',
    createdAt: '2026-07-31T00:00:00.000Z',
    updatedAt: '2026-07-31T00:00:00.000Z',
  }
}

describe('parentTechniqueId', () => {
  it('derives the parent of a subtechnique', () => {
    expect(parentTechniqueId('T1110.001')).toBe('T1110')
  })

  it('returns null for a parent technique', () => {
    expect(parentTechniqueId('T1110')).toBeNull()
  })
})

describe('buildSubtechniqueEdges', () => {
  it('links a subtechnique to its parent technique', () => {
    const nodes = [node('parent', 'T1110'), node('sub', 'T1110.001', 'mitre_subtechnique')]

    const edges = buildSubtechniqueEdges(nodes, 'en')

    expect(edges).toHaveLength(1)
    expect(edges[0].source).toBe('parent')
    expect(edges[0].target).toBe('sub')
    expect(edges[0].type).toBe('parent_of')
  })

  it('creates connections the analyst can edit, not derived ones', () => {
    const nodes = [node('parent', 'T1110'), node('sub', 'T1110.001', 'mitre_subtechnique')]
    expect(buildSubtechniqueEdges(nodes, 'en')[0].automatic).toBe(false)
  })

  it('only uses handle ids that exist on a node', () => {
    const nodes = [node('parent', 'T1110'), node('sub', 'T1110.001', 'mitre_subtechnique')]
    for (const edge of buildSubtechniqueEdges(nodes, 'en')) {
      expect(isHandleId(edge.sourceHandle)).toBe(true)
      expect(isHandleId(edge.targetHandle)).toBe(true)
    }
  })

  it('links every subtechnique of the same parent', () => {
    const nodes = [
      node('parent', 'T1110'),
      node('s1', 'T1110.001', 'mitre_subtechnique'),
      node('s2', 'T1110.003', 'mitre_subtechnique'),
    ]

    const edges = buildSubtechniqueEdges(nodes, 'en')

    expect(edges.map((e) => e.target).sort()).toEqual(['s1', 's2'])
  })

  it('does not link a subtechnique whose parent is absent', () => {
    const nodes = [node('sub', 'T1110.001', 'mitre_subtechnique'), node('other', 'T1078')]

    expect(buildSubtechniqueEdges(nodes, 'en')).toEqual([])
  })

  it('never links a subtechnique to an unrelated technique', () => {
    const nodes = [node('parent', 'T1078'), node('sub', 'T1110.001', 'mitre_subtechnique')]

    expect(buildSubtechniqueEdges(nodes, 'en')).toEqual([])
  })

  it('ignores nodes that are not techniques', () => {
    const nodes = [
      node('tac', 'TA0006', 'mitre_tactic'),
      node('host', 'evidence.identity.host', 'host'),
    ]

    expect(buildSubtechniqueEdges(nodes, 'en')).toEqual([])
  })
})
