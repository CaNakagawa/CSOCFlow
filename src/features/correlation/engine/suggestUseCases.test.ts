import { describe, expect, it } from 'vitest'
import { suggestUseCases } from './suggestUseCases'
import type { InvestigationNode } from '../../../shared/types/investigation'
import type { UseCaseDefinition } from '../../../shared/types/knowledge'

const L = (text: string) => ({ en: text, pt: text, de: text })
const LL = (items: string[]) => ({ en: items, pt: items, de: items })

function makeUseCase(
  partial: Partial<UseCaseDefinition> & Pick<UseCaseDefinition, 'id' | 'techniques'>,
): UseCaseDefinition {
  return {
    name: L(partial.id),
    description: L(''),
    tactics: [],
    investigationSteps: [],
    dataSources: LL([]),
    relatedHypotheses: [],
    sourceReference: null,
    ...partial,
  }
}

function makeTechniqueNode(id: string, definitionId: string): InvestigationNode {
  return {
    id,
    definitionId,
    type: 'mitre_technique',
    label: definitionId,
    state: 'observed',
    position: { x: 0, y: 0 },
    fields: {},
    notes: '',
    createdAt: '2026-07-30T00:00:00.000Z',
    updatedAt: '2026-07-30T00:00:00.000Z',
  }
}

describe('suggestUseCases', () => {
  const userAccountUseCase = makeUseCase({
    id: 'use-case.user_account_created_deleted',
    techniques: ['T1098', 'T1078'],
  })
  const bruteForceUseCase = makeUseCase({
    id: 'use-case.suspicious_authentication',
    techniques: ['T1110', 'T1110.001'],
  })

  it('suggests a use case when at least one of its techniques is present, ranked by match ratio', () => {
    const nodes = [makeTechniqueNode('n1', 'T1098'), makeTechniqueNode('n2', 'T1078')]

    const result = suggestUseCases(nodes, [userAccountUseCase, bruteForceUseCase])

    expect(result).toHaveLength(1)
    expect(result[0].useCaseId).toBe('use-case.user_account_created_deleted')
    expect(result[0].matchedTechniques.sort()).toEqual(['T1078', 'T1098'])
    expect(result[0].missingTechniques).toEqual([])
    expect(result[0].matchRatio).toBe(1)
    expect(result[0].applied).toBe(false)
  })

  it('ranks partial matches below full matches', () => {
    const nodes = [makeTechniqueNode('n1', 'T1098')]

    const result = suggestUseCases(nodes, [userAccountUseCase])

    expect(result[0].matchedTechniques).toEqual(['T1098'])
    expect(result[0].missingTechniques).toEqual(['T1078'])
    expect(result[0].matchRatio).toBe(0.5)
  })

  it('does not suggest use cases with no technique overlap at all', () => {
    const nodes = [makeTechniqueNode('n1', 'T1059.001')]

    const result = suggestUseCases(nodes, [userAccountUseCase, bruteForceUseCase])

    expect(result).toHaveLength(0)
  })

  it('marks a use case as applied when its detection_use_case node is already on canvas', () => {
    const nodes: InvestigationNode[] = [
      makeTechniqueNode('n1', 'T1098'),
      makeTechniqueNode('n2', 'T1078'),
      {
        id: 'uc1',
        definitionId: 'use-case.user_account_created_deleted',
        type: 'detection_use_case',
        label: 'User Account Created/Deleted',
        state: 'unknown',
        position: { x: 0, y: 0 },
        fields: {},
        notes: '',
        createdAt: '2026-07-30T00:00:00.000Z',
        updatedAt: '2026-07-30T00:00:00.000Z',
      },
    ]

    const result = suggestUseCases(nodes, [userAccountUseCase])

    expect(result[0].applied).toBe(true)
  })
})
