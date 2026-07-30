import { beforeEach, describe, expect, it } from 'vitest'
import { combineEdges, useInvestigationStore } from './investigationStore'
import type { KnowledgeBase, UseCaseDefinition } from '../../../shared/types/knowledge'

const L = (text: string) => ({ en: text, pt: text, de: text })
const LL = (items: string[]) => ({ en: items, pt: items, de: items })

function makeKnowledgeBaseWithTechniques(): KnowledgeBase {
  return {
    version: '1.0.0',
    tactics: [
      { id: 'TA0003', name: 'Persistence', shortName: 'persistence' },
      { id: 'TA0005', name: 'Stealth', shortName: 'stealth' },
    ],
    techniques: [
      {
        id: 'T1098',
        name: 'Account Manipulation',
        type: 'mitre_technique',
        tactics: ['TA0003', 'TA0005'],
        platforms: [],
        brief: L(''),
        investigation_context: {
          what_it_means: L(''),
          why_it_matters: L(''),
          suspicious_when: LL([]),
          legitimate_when: LL([]),
          common_mistakes: LL([]),
        },
        detection_analytics: [],
        expected_evidence: [],
        related_hypotheses: [],
        suggested_checks: [],
        references: [],
      },
      {
        id: 'T1078',
        name: 'Valid Accounts',
        type: 'mitre_technique',
        tactics: ['TA0003'],
        platforms: [],
        brief: L(''),
        investigation_context: {
          what_it_means: L(''),
          why_it_matters: L(''),
          suspicious_when: LL([]),
          legitimate_when: LL([]),
          common_mistakes: LL([]),
        },
        detection_analytics: [],
        expected_evidence: [],
        related_hypotheses: [],
        suggested_checks: [],
        references: [],
      },
    ],
    evidenceTypes: [],
    hypotheses: [],
    checks: [],
    useCases: [],
    relationshipRules: [],
  }
}

const userAccountUseCase: UseCaseDefinition = {
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

describe('investigationStore', () => {
  beforeEach(() => {
    useInvestigationStore.getState().newInvestigation()
  })

  it('adds a node with default field values derived from the field definitions', () => {
    const { addNode } = useInvestigationStore.getState()
    const nodeId = addNode({
      nodeType: 'ip_address',
      definitionId: 'evidence.network.ip_address',
      label: '198.51.100.23',
      position: { x: 10, y: 20 },
      fieldDefinitions: [
        { id: 'value', label: L('IP'), type: 'ip', required: true },
        { id: 'is_approved_scanner', label: L('Scanner?'), type: 'boolean', required: false },
        { id: 'tags', label: L('Tags'), type: 'string_array', required: false },
      ],
    })

    const node = useInvestigationStore.getState().nodes.find((n) => n.id === nodeId)
    expect(node).toBeDefined()
    expect(node!.state).toBe('unknown')
    expect(node!.fields).toEqual({ value: '', is_approved_scanner: false, tags: [] })
    expect(useInvestigationStore.getState().selectedNodeId).toBe(nodeId)
  })

  it('updates node fields, state and notes', () => {
    const { addNode, updateNodeFields, updateNodeState, updateNodeNotes } =
      useInvestigationStore.getState()
    const nodeId = addNode({
      nodeType: 'user',
      definitionId: 'evidence.identity.user',
      label: 'root',
      position: { x: 0, y: 0 },
      fieldDefinitions: [{ id: 'username', label: L('Username'), type: 'string', required: true }],
    })

    updateNodeFields(nodeId, { username: 'root' })
    updateNodeState(nodeId, 'suspicious')
    updateNodeNotes(nodeId, 'Conta privilegiada alvo do ataque.')

    const node = useInvestigationStore.getState().nodes.find((n) => n.id === nodeId)
    expect(node!.fields.username).toBe('root')
    expect(node!.state).toBe('suspicious')
    expect(node!.notes).toBe('Conta privilegiada alvo do ataque.')
  })

  it('removes a node and any edges referencing it', () => {
    const { addNode, addManualEdge, removeNode } = useInvestigationStore.getState()
    const a = addNode({
      nodeType: 'host',
      definitionId: 'd1',
      label: 'host-a',
      position: { x: 0, y: 0 },
      fieldDefinitions: [],
    })
    const b = addNode({
      nodeType: 'ip_address',
      definitionId: 'd2',
      label: 'ip-b',
      position: { x: 0, y: 0 },
      fieldDefinitions: [],
    })
    addManualEdge(a, b, 'connected_to')

    removeNode(a)

    const state = useInvestigationStore.getState()
    expect(state.nodes.find((n) => n.id === a)).toBeUndefined()
    expect(state.manualEdges).toHaveLength(0)
  })

  it('adds a technique together with the tactic nodes it belongs to', () => {
    const { addTechniqueWithTactics } = useInvestigationStore.getState()
    const knowledgeBase = makeKnowledgeBaseWithTechniques()
    const technique = knowledgeBase.techniques.find((t) => t.id === 'T1098')!

    const nodeId = addTechniqueWithTactics(technique, knowledgeBase)

    const state = useInvestigationStore.getState()
    expect(state.nodes.find((n) => n.id === nodeId)!.definitionId).toBe('T1098')
    expect(
      state.nodes
        .filter((n) => n.type === 'mitre_tactic')
        .map((n) => n.definitionId)
        .sort(),
    ).toEqual(['TA0003', 'TA0005'])
    expect(state.selectedNodeId).toBe(nodeId)
  })

  it('does not duplicate a tactic node that is already on the canvas', () => {
    const { addTechniqueWithTactics, addNode } = useInvestigationStore.getState()
    const knowledgeBase = makeKnowledgeBaseWithTechniques()
    const technique = knowledgeBase.techniques.find((t) => t.id === 'T1098')!

    addNode({
      nodeType: 'mitre_tactic',
      definitionId: 'TA0003',
      label: 'TA0003 - Persistence',
      position: { x: 0, y: 0 },
      fieldDefinitions: [],
    })
    addTechniqueWithTactics(technique, knowledgeBase)

    const state = useInvestigationStore.getState()
    expect(state.nodes.filter((n) => n.definitionId === 'TA0003')).toHaveLength(1)
    expect(state.nodes.filter((n) => n.type === 'mitre_tactic')).toHaveLength(2)
  })

  it('skips tactics that are missing from the knowledge base', () => {
    const { addTechniqueWithTactics } = useInvestigationStore.getState()
    const knowledgeBase = makeKnowledgeBaseWithTechniques()
    const technique = { ...knowledgeBase.techniques[0], tactics: ['TA9999'] }

    addTechniqueWithTactics(technique, knowledgeBase)

    const state = useInvestigationStore.getState()
    expect(state.nodes.filter((n) => n.type === 'mitre_tactic')).toHaveLength(0)
    expect(state.nodes).toHaveLength(1)
  })

  it('keeps the auto-link preference across a new investigation', () => {
    useInvestigationStore.getState().setAutoLinkTactics(true)

    useInvestigationStore.getState().newInvestigation()

    expect(useInvestigationStore.getState().autoLinkTactics).toBe(true)
    useInvestigationStore.getState().setAutoLinkTactics(false)
  })

  it('applies a use case by adding a hub node and its missing technique nodes', () => {
    const { applyUseCase } = useInvestigationStore.getState()
    const knowledgeBase = makeKnowledgeBaseWithTechniques()

    applyUseCase(userAccountUseCase, knowledgeBase, 'en')

    const state = useInvestigationStore.getState()
    const hub = state.nodes.find((n) => n.type === 'detection_use_case')
    const t1098 = state.nodes.find((n) => n.definitionId === 'T1098')
    const t1078 = state.nodes.find((n) => n.definitionId === 'T1078')

    expect(hub).toBeDefined()
    expect(hub!.definitionId).toBe(userAccountUseCase.id)
    expect(t1098).toBeDefined()
    expect(t1078).toBeDefined()
    expect(state.selectedNodeId).toBe(hub!.id)
  })

  it('does not duplicate nodes when a use case is applied twice or its techniques already exist', () => {
    const { applyUseCase, addNode } = useInvestigationStore.getState()
    const knowledgeBase = makeKnowledgeBaseWithTechniques()

    addNode({
      nodeType: 'mitre_technique',
      definitionId: 'T1098',
      label: 'T1098 - Account Manipulation',
      position: { x: 0, y: 0 },
      fieldDefinitions: [],
    })

    applyUseCase(userAccountUseCase, knowledgeBase, 'en')
    applyUseCase(userAccountUseCase, knowledgeBase, 'en')

    const state = useInvestigationStore.getState()
    expect(state.nodes.filter((n) => n.type === 'detection_use_case')).toHaveLength(1)
    expect(state.nodes.filter((n) => n.definitionId === 'T1098')).toHaveLength(1)
    expect(state.nodes.filter((n) => n.definitionId === 'T1078')).toHaveLength(1)
  })

  it('stores the exact source/target handle used when a manual edge is created', () => {
    const { addManualEdge } = useInvestigationStore.getState()

    addManualEdge('node-a', 'node-b', 'associated_with', undefined, 'right', 'left')

    const edge = useInvestigationStore.getState().manualEdges[0]
    expect(edge.sourceHandle).toBe('right')
    expect(edge.targetHandle).toBe('left')
  })

  it('reconnects a manual edge to a new source/target and handle', () => {
    const { addManualEdge, updateManualEdgeConnection } = useInvestigationStore.getState()
    addManualEdge('node-a', 'node-b', 'associated_with', undefined, 'right', 'left')
    const edgeId = useInvestigationStore.getState().manualEdges[0].id

    updateManualEdgeConnection(edgeId, {
      source: 'node-a',
      target: 'node-c',
      sourceHandle: 'bottom',
      targetHandle: 'top',
    })

    const edge = useInvestigationStore.getState().manualEdges[0]
    expect(edge.target).toBe('node-c')
    expect(edge.sourceHandle).toBe('bottom')
    expect(edge.targetHandle).toBe('top')
  })

  it('updates a manual edge label used as a connection comment', () => {
    const { addManualEdge, updateEdgeLabel } = useInvestigationStore.getState()
    addManualEdge('node-a', 'node-b', 'associated_with')
    const edgeId = useInvestigationStore.getState().manualEdges[0].id

    updateEdgeLabel(edgeId, 'Confirmado pelo analista')

    expect(useInvestigationStore.getState().manualEdges[0].label).toBe('Confirmado pelo analista')
  })

  it('updates a manual edge relationship type', () => {
    const { addManualEdge, updateManualEdgeType } = useInvestigationStore.getState()
    addManualEdge('node-a', 'node-b', 'associated_with')
    const edgeId = useInvestigationStore.getState().manualEdges[0].id

    updateManualEdgeType(edgeId, 'targeted')

    expect(useInvestigationStore.getState().manualEdges[0].type).toBe('targeted')
  })

  it('duplicates a node with a new id, offset position and copied fields', () => {
    const { addNode, duplicateNode } = useInvestigationStore.getState()
    const originalId = addNode({
      nodeType: 'user',
      definitionId: 'evidence.identity.user',
      label: 'root',
      position: { x: 10, y: 20 },
      fieldDefinitions: [{ id: 'username', label: L('Username'), type: 'string', required: true }],
    })
    const { updateNodeFields, updateNodeState } = useInvestigationStore.getState()
    updateNodeFields(originalId, { username: 'root' })
    updateNodeState(originalId, 'suspicious')

    const copyId = duplicateNode(originalId)

    const state = useInvestigationStore.getState()
    const copy = state.nodes.find((n) => n.id === copyId)
    expect(copyId).not.toBe(originalId)
    expect(copy).toBeDefined()
    expect(copy!.label).toBe('root (cópia)')
    expect(copy!.position).toEqual({ x: 40, y: 50 })
    expect(copy!.fields.username).toBe('root')
    expect(copy!.state).toBe('suspicious')
    expect(state.selectedNodeId).toBe(copyId)
    expect(state.nodes).toHaveLength(2)
  })

  it('returns undefined when duplicating a node id that does not exist', () => {
    const { duplicateNode } = useInvestigationStore.getState()
    expect(duplicateNode('does-not-exist')).toBeUndefined()
  })

  it('serializes the current state into an Investigation document', () => {
    const { addNode, toDocument } = useInvestigationStore.getState()
    addNode({
      nodeType: 'host',
      definitionId: 'd1',
      label: 'host-a',
      position: { x: 5, y: 5 },
      fieldDefinitions: [],
    })

    const doc = toDocument()
    expect(doc.canvas.nodes).toHaveLength(1)
    expect(doc.schemaVersion).toBe('1.0.0')
  })
})

describe('combineEdges', () => {
  it('deduplicates by id, preferring manual edges to override inferred ones with the same id', () => {
    const inferred = [
      { id: 'e1', source: 'a', target: 'b', type: 'connected_to' as const, automatic: true },
    ]
    const manual = [
      { id: 'e2', source: 'a', target: 'c', type: 'connected_to' as const, automatic: false },
    ]

    const result = combineEdges(inferred, manual)
    expect(result.map((e) => e.id)).toEqual(['e1', 'e2'])
  })
})
