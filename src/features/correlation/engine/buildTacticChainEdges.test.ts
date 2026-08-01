import { describe, expect, it } from 'vitest'
import { buildTacticChainEdges } from './buildTacticChainEdges'
import type { InvestigationNode } from '../../../shared/types/investigation'
import type { MitreTactic } from '../../../shared/types/knowledge'
import { isHandleId } from '../../../shared/types/handles'

/** Matrix order, where the ids are deliberately not sequential. */
const tactics: MitreTactic[] = [
  { id: 'TA0043', name: 'Reconnaissance', shortName: 'reconnaissance' },
  { id: 'TA0001', name: 'Initial Access', shortName: 'initial-access' },
  { id: 'TA0003', name: 'Persistence', shortName: 'persistence' },
  { id: 'TA0040', name: 'Impact', shortName: 'impact' },
]

function node(
  id: string,
  definitionId: string,
  type: InvestigationNode['type'] = 'mitre_tactic',
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

describe('buildTacticChainEdges', () => {
  it('chains tactics in matrix order, not the order they were added', () => {
    const nodes = [node('c', 'TA0040'), node('a', 'TA0043'), node('b', 'TA0001')]

    const edges = buildTacticChainEdges(nodes, tactics)

    expect(edges.map((e) => [e.source, e.target])).toEqual([
      ['a', 'b'],
      ['b', 'c'],
    ])
  })

  it('connects side by side, left to right', () => {
    const nodes = [node('a', 'TA0043'), node('b', 'TA0001')]

    const [edge] = buildTacticChainEdges(nodes, tactics)

    expect(edge.sourceHandle).toBe('right')
    expect(edge.targetHandle).toBe('left')
    expect(isHandleId(edge.sourceHandle)).toBe(true)
    expect(isHandleId(edge.targetHandle)).toBe(true)
  })

  it('bridges gaps rather than leaving tactics unchained', () => {
    // only the first and last of the matrix are present
    const nodes = [node('a', 'TA0043'), node('d', 'TA0040')]

    const edges = buildTacticChainEdges(nodes, tactics)

    expect(edges).toHaveLength(1)
    expect([edges[0].source, edges[0].target]).toEqual(['a', 'd'])
  })

  it('produces nothing for a single tactic', () => {
    expect(buildTacticChainEdges([node('a', 'TA0043')], tactics)).toEqual([])
  })

  it('ignores nodes that are not tactics', () => {
    const nodes = [node('t', 'T1110', 'mitre_technique'), node('a', 'TA0043')]
    expect(buildTacticChainEdges(nodes, tactics)).toEqual([])
  })

  it('creates connections the analyst can edit', () => {
    const nodes = [node('a', 'TA0043'), node('b', 'TA0001')]
    expect(buildTacticChainEdges(nodes, tactics)[0].automatic).toBe(false)
  })

  it('carries no caption, so a row of tactics is not repeated text', () => {
    const nodes = [node('a', 'TA0043'), node('b', 'TA0001')]
    const [edge] = buildTacticChainEdges(nodes, tactics)

    expect(edge.label).toBeUndefined()
    // the relationship itself survives for the edge editor
    expect(edge.type).toBe('occurred_before')
  })
})
