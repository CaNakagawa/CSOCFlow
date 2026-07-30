import { describe, expect, it } from 'vitest'
import { inferUseCaseLinks } from './inferUseCaseLinks'
import type { InvestigationNode } from '../../../shared/types/investigation'
import type { UseCaseDefinition } from '../../../shared/types/knowledge'
import { isSourceHandleId, isTargetHandleId } from '../../../shared/types/handles'

const L = (text: string) => ({ en: text, pt: text, de: text })
const LL = (items: string[]) => ({ en: items, pt: items, de: items })

const useCase: UseCaseDefinition = {
  id: 'use-case.user_account_created_deleted',
  name: L('User Account Created/Deleted'),
  description: L(''),
  tactics: ['TA0003', 'TA0004'],
  techniques: ['T1098', 'T1078'],
  investigationSteps: [],
  dataSources: LL([]),
  relatedHypotheses: [],
  sourceReference: null,
}

function node(
  partial: Partial<InvestigationNode> & Pick<InvestigationNode, 'id' | 'type' | 'definitionId'>,
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

describe('inferUseCaseLinks', () => {
  it('creates a maps_to edge from the use case hub node to each matching technique node present', () => {
    const nodes: InvestigationNode[] = [
      node({ id: 'uc1', type: 'detection_use_case', definitionId: useCase.id }),
      node({ id: 't1', type: 'mitre_technique', definitionId: 'T1098' }),
      node({ id: 't2', type: 'mitre_technique', definitionId: 'T1078' }),
    ]

    const edges = inferUseCaseLinks(nodes, [useCase], 'en')

    expect(edges).toHaveLength(2)
    expect(edges.every((e) => e.source === 'uc1' && e.type === 'maps_to' && e.automatic)).toBe(true)
    expect(edges.map((e) => e.target).sort()).toEqual(['t1', 't2'])
    for (const edge of edges) {
      expect(isSourceHandleId(edge.sourceHandle)).toBe(true)
      expect(isTargetHandleId(edge.targetHandle)).toBe(true)
    }
  })

  it('only links techniques that are actually present on the canvas', () => {
    const nodes: InvestigationNode[] = [
      node({ id: 'uc1', type: 'detection_use_case', definitionId: useCase.id }),
      node({ id: 't1', type: 'mitre_technique', definitionId: 'T1098' }),
    ]

    const edges = inferUseCaseLinks(nodes, [useCase], 'en')

    expect(edges).toHaveLength(1)
    expect(edges[0].target).toBe('t1')
  })

  it('produces no edges when there is no detection_use_case node on canvas', () => {
    const nodes: InvestigationNode[] = [
      node({ id: 't1', type: 'mitre_technique', definitionId: 'T1098' }),
    ]

    expect(inferUseCaseLinks(nodes, [useCase], 'en')).toEqual([])
  })
})
