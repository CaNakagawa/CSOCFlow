import { useCallback, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ConnectionMode,
  MarkerType,
  Panel,
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
import { CanvasActions } from './CanvasActions'
import { relationshipKey } from '../utils/nodeVisuals'
import { useI18n } from '../../../shared/i18n'
import type { EdgeLineStyle, RelationshipType } from '../../../shared/types/investigation'
import type { DetectionAnalytic, KnowledgeBase } from '../../../shared/types/knowledge'
import './Canvas.css'

const nodeTypes = { generic: GenericNode }

const RELATIONSHIP_TYPES: RelationshipType[] = [
  'executed_by',
  'executed_on',
  'parent_of',
  'child_of',
  'connected_to',
  'downloaded_from',
  'resolved_to',
  'authenticated_from',
  'targeted',
  'associated_with',
  'supports_hypothesis',
  'contradicts_hypothesis',
  'maps_to',
  'occurred_before',
  'occurred_after',
]

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
  color?: string
  lineStyle: EdgeLineStyle
}

const AUTOMATIC_EDGE_COLOR = '#64748b'
const MANUAL_EDGE_COLOR = '#3b82f6'

const EDGE_COLORS = [
  MANUAL_EDGE_COLOR,
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#a855f7',
  AUTOMATIC_EDGE_COLOR,
]

interface CanvasProps {
  knowledgeBase: KnowledgeBase | null
}

export function Canvas({ knowledgeBase }: CanvasProps) {
  const { t } = useI18n()
  const nodes = useInvestigationStore((s) => s.nodes)
  const manualEdges = useInvestigationStore((s) => s.manualEdges)
  const inferredEdges = useInvestigationStore((s) => s.inferredEdges)
  const edges = useMemo(
    () => combineEdges(inferredEdges, manualEdges),
    [inferredEdges, manualEdges],
  )
  const selectedNodeId = useInvestigationStore((s) => s.selectedNodeId)
  const selectedAnalytic = useInvestigationStore((s) => s.selectedAnalytic)
  const moveNode = useInvestigationStore((s) => s.moveNode)
  const selectNode = useInvestigationStore((s) => s.selectNode)
  const removeNode = useInvestigationStore((s) => s.removeNode)
  const addManualEdge = useInvestigationStore((s) => s.addManualEdge)
  const removeEdge = useInvestigationStore((s) => s.removeEdge)
  const updateManualEdgeConnection = useInvestigationStore((s) => s.updateManualEdgeConnection)
  const updateEdgeLabel = useInvestigationStore((s) => s.updateEdgeLabel)
  const updateManualEdgeType = useInvestigationStore((s) => s.updateManualEdgeType)
  const updateEdgeStyle = useInvestigationStore((s) => s.updateEdgeStyle)
  const pushHistory = useInvestigationStore((s) => s.pushHistory)

  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [commentEditor, setCommentEditor] = useState<CommentEditorState | null>(null)

  const analyticsByDefinition = useMemo(() => {
    const map = new Map<string, DetectionAnalytic[]>()
    for (const technique of knowledgeBase?.techniques ?? []) {
      if (technique.detection_analytics.length > 0) {
        map.set(technique.id, technique.detection_analytics)
      }
    }
    return map
  }, [knowledgeBase])

  const flowNodes: Node<GenericNodeData>[] = useMemo(
    () =>
      nodes.map((n) => ({
        id: n.id,
        type: 'generic',
        position: n.position,
        selected: n.id === selectedNodeId,
        data: {
          label: n.label,
          nodeType: n.type,
          state: n.state,
          scaffold: n.scaffold,
          nodeId: n.id,
          analytics: analyticsByDefinition.get(n.definitionId) ?? [],
          analyticsExpanded: n.analyticsExpanded ?? false,
          analyticStatuses: n.analyticStatuses ?? {},
          selectedAnalyticId:
            selectedAnalytic?.nodeId === n.id ? selectedAnalytic.analyticId : null,
        },
      })),
    [nodes, selectedNodeId, analyticsByDefinition, selectedAnalytic],
  )

  const flowEdges: Edge<FlowEdgeData>[] = useMemo(
    () =>
      edges.map((e) => {
        const stroke = e.color ?? (e.automatic ? AUTOMATIC_EDGE_COLOR : MANUAL_EDGE_COLOR)
        const dashed = e.lineStyle ? e.lineStyle === 'dashed' : e.automatic
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          label: e.label,
          selected: e.id === selectedEdgeId,
          reconnectable: !e.automatic,
          data: { automatic: e.automatic, type: e.type },
          markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
          style: { stroke, strokeDasharray: dashed ? '4 3' : undefined },
        }
      }),
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

  // One undo step per drag, not one per animation frame.
  const onNodeDragStart = useCallback(() => {
    pushHistory()
  }, [pushHistory])

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

  const onEdgeDoubleClick: EdgeMouseHandler<Edge<FlowEdgeData>> = useCallback(
    (event, edge) => {
      if (edge.data?.automatic) return
      event.stopPropagation()
      const stored = edges.find((e) => e.id === edge.id)
      setCommentEditor({
        edgeId: edge.id,
        x: event.clientX,
        y: event.clientY,
        value: typeof edge.label === 'string' ? edge.label : '',
        type: edge.data?.type ?? 'associated_with',
        color: stored?.color,
        lineStyle: stored?.lineStyle ?? 'solid',
      })
    },
    [edges],
  )

  const commitComment = useCallback(() => {
    if (!commentEditor) return
    updateEdgeLabel(commentEditor.edgeId, commentEditor.value)
    updateManualEdgeType(commentEditor.edgeId, commentEditor.type)
    updateEdgeStyle(commentEditor.edgeId, {
      color: commentEditor.color,
      lineStyle: commentEditor.lineStyle,
    })
    setCommentEditor(null)
  }, [commentEditor, updateEdgeLabel, updateManualEdgeType, updateEdgeStyle])

  return (
    <div className="canvas-area" role="application" aria-label="Investigation canvas">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onNodeDragStart={onNodeDragStart}
        onNodeClick={onNodeClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onPaneClick={onPaneClick}
        connectionMode={ConnectionMode.Loose}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
      >
        <Panel position="top-right">
          <CanvasActions knowledgeBase={knowledgeBase} />
        </Panel>
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
                {t(relationshipKey(type))}
              </option>
            ))}
          </select>
          <input
            autoFocus
            type="text"
            placeholder={t('canvas.commentPlaceholder')}
            value={commentEditor.value}
            onChange={(e) => setCommentEditor({ ...commentEditor, value: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitComment()
              if (e.key === 'Escape') setCommentEditor(null)
            }}
          />

          <div className="edge-comment-editor__row" role="group" aria-label={t('canvas.edgeColor')}>
            {EDGE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className="edge-comment-editor__swatch"
                style={{ background: color }}
                aria-label={color}
                aria-pressed={(commentEditor.color ?? MANUAL_EDGE_COLOR) === color}
                onClick={() => setCommentEditor({ ...commentEditor, color })}
              />
            ))}
          </div>

          <div className="edge-comment-editor__row" role="group" aria-label={t('canvas.edgeStyle')}>
            {(['solid', 'dashed'] as EdgeLineStyle[]).map((style) => (
              <button
                key={style}
                type="button"
                className="edge-comment-editor__style"
                aria-pressed={commentEditor.lineStyle === style}
                onClick={() => setCommentEditor({ ...commentEditor, lineStyle: style })}
              >
                {t(style === 'solid' ? 'canvas.edgeSolid' : 'canvas.edgeDashed')}
              </button>
            ))}
          </div>

          <button type="button" onClick={commitComment}>
            {t('canvas.save')}
          </button>
        </div>
      )}
    </div>
  )
}
