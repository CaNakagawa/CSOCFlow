import { beforeEach, describe, expect, it } from 'vitest'
import { combineEdges, useInvestigationStore } from './investigationStore'

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
        { id: 'value', label: 'IP', type: 'ip', required: true },
        { id: 'is_approved_scanner', label: 'Scanner?', type: 'boolean', required: false },
        { id: 'tags', label: 'Tags', type: 'string_array', required: false },
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
      fieldDefinitions: [{ id: 'username', label: 'Usuário', type: 'string', required: true }],
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
