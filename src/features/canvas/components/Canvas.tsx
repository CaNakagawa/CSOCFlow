import { useCallback, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  MarkerType,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type OnNodesChange,
  type OnEdgesChange,
  type NodeChange,
  type EdgeChange,
  type OnConnect,
  type OnReconnect,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { combineEdges, useInvestigationStore } from '../../investigation/store/investigationStore'
import { GenericNode, type GenericNodeData } from '../nodeTypes/GenericNode'
import { RELATIONSHIP_TYPE_LABELS } from '../utils/nodeVisuals'
import type { RelationshipType } from '../../../shared/types/investigation'
import './Canvas.css'

const nodeTypes = { generic: GenericNode }

const RELATIONSHIP_TYPES = Object.keys(RELATIONSHIP_TYPE_LABELS) as RelationshipType[]

interface FlowEdgeData extends Record<string, unknown> {
  automatic: boolean
  type: RelationshipType
}

interface CommentEditorState {
  edgeId: string
  x: number
  y: number
  value: string
  type: RelationshipType
}

export function Canvas() {
  const nodes = useInvestigationStore((s) => s.nodes)
  const manualEdges = useInvestigationStore((s) => s.manualEdges)
  const inferredEdges = useInvestigationStore((s) => s.inferredEdges)
  const edges = useMemo(
    () => combineEdges(inferredEdges, manualEdges),
    [inferredEdges, manualEdges],
  )
  const selectedNodeId = useInvestigationStore((s) => s.selectedNodeId)
  const moveNode = useInvestigationStore((s) => s.moveNode)
  const selectNode = useInvestigationStore((s) => s.selectNode)
  const removeNode = useInvestigationStore((s) => s.removeNode)
  const addManualEdge = useInvestigationStore((s) => s.addManualEdge)
  const removeEdge = useInvestigationStore((s) => s.removeEdge)
  const updateManualEdgeConnection = useInvestigationStore((s) => s.updateManualEdgeConnection)
  const updateEdgeLabel = useInvestigationStore((s) => s.updateEdgeLabel)
  const updateManualEdgeType = useInvestigationStore((s) => s.updateManualEdgeType)

  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [commentEditor, setCommentEditor] = useState<CommentEditorState | null>(null)

  const flowNodes: Node<GenericNodeData>[] = useMemo(
    () =>
      nodes.map((n) => ({
        id: n.id,
        type: 'generic',
        position: n.position,
        selected: n.id === selectedNodeId,
        data: { label: n.label, nodeType: n.type, state: n.state },
      })),
    [nodes, selectedNodeId],
  )

  const flowEdges: Edge<FlowEdgeData>[] = useMemo(
    () =>
      edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        label: e.label,
        selected: e.id === selectedEdgeId,
        reconnectable: !e.automatic,
        data: { automatic: e.automatic, type: e.type },
        markerEnd: { type: MarkerType.ArrowClosed, color: e.automatic ? '#64748b' : '#3b82f6' },
        style: e.automatic ? { strokeDasharray: '4 3', stroke: '#64748b' } : { stroke: '#3b82f6' },
      })),
    [edges, selectedEdgeId],
  )

  const onNodesChange: OnNodesChange<Node<GenericNodeData>> = useCallback(
    (changes: NodeChange<Node<GenericNodeData>>[]) => {
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          moveNode(change.id, change.position)
        }
        if (change.type === 'remove') {
          removeNode(change.id)
        }
      }
    },
    [moveNode, removeNode],
  )

  const onNodeClick: NodeMouseHandler<Node<GenericNodeData>> = useCallback(
    (_event, node) => {
      selectNode(node.id)
    },
    [selectNode],
  )

  const onPaneClick = useCallback(() => {
    selectNode(null)
    setSelectedEdgeId(null)
    setCommentEditor(null)
  }, [selectNode])

  const onConnect: OnConnect = useCallback(
    (connection) => {
      if (!connection.source || !connection.target) return
      if (connection.source === connection.target) return
      addManualEdge(
        connection.source,
        connection.target,
        'associated_with',
        undefined,
        connection.sourceHandle ?? undefined,
        connection.targetHandle ?? undefined,
      )
    },
    [addManualEdge],
  )

  const onEdgesChange: OnEdgesChange<Edge<FlowEdgeData>> = useCallback(
    (changes: EdgeChange<Edge<FlowEdgeData>>[]) => {
      for (const change of changes) {
        if (change.type === 'remove') {
          removeEdge(change.id)
        }
        if (change.type === 'select') {
          setSelectedEdgeId(change.selected ? change.id : null)
        }
      }
    },
    [removeEdge],
  )

  const onReconnect: OnReconnect<Edge<FlowEdgeData>> = useCallback(
    (oldEdge, newConnection) => {
      if (oldEdge.data?.automatic) return
      if (!newConnection.source || !newConnection.target) return
      updateManualEdgeConnection(oldEdge.id, {
        source: newConnection.source,
        target: newConnection.target,
        sourceHandle: newConnection.sourceHandle ?? undefined,
        targetHandle: newConnection.targetHandle ?? undefined,
      })
    },
    [updateManualEdgeConnection],
  )

  const onEdgeDoubleClick: EdgeMouseHandler<Edge<FlowEdgeData>> = useCallback((event, edge) => {
    if (edge.data?.automatic) return
    event.stopPropagation()
    setCommentEditor({
      edgeId: edge.id,
      x: event.clientX,
      y: event.clientY,
      value: typeof edge.label === 'string' ? edge.label : '',
      type: edge.data?.type ?? 'associated_with',
    })
  }, [])

  const commitComment = useCallback(() => {
    if (!commentEditor) return
    updateEdgeLabel(commentEditor.edgeId, commentEditor.value)
    updateManualEdgeType(commentEditor.edgeId, commentEditor.type)
    setCommentEditor(null)
  }, [commentEditor, updateEdgeLabel, updateManualEdgeType])

  return (
    <div className="canvas-area" role="application" aria-label="Canvas de investigação">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onNodeClick={onNodeClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onPaneClick={onPaneClick}
        connectionMode={ConnectionMode.Loose}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>

      {commentEditor && (
        <div
          className="edge-comment-editor"
          style={{ left: commentEditor.x, top: commentEditor.y }}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as globalThis.Node | null)) {
              commitComment()
            }
          }}
        >
          <select
            value={commentEditor.type}
            onChange={(e) =>
              setCommentEditor({ ...commentEditor, type: e.target.value as RelationshipType })
            }
          >
            {RELATIONSHIP_TYPES.map((type) => (
              <option key={type} value={type}>
                {RELATIONSHIP_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <input
            autoFocus
            type="text"
            placeholder="Comentário da conexão..."
            value={commentEditor.value}
            onChange={(e) => setCommentEditor({ ...commentEditor, value: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitComment()
              if (e.key === 'Escape') setCommentEditor(null)
            }}
          />
          <button type="button" onClick={commitComment}>
            Salvar
          </button>
        </div>
      )}
    </div>
  )
}
