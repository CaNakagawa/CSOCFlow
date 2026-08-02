import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
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
import { NodeContextMenu, type ContextMenuState } from './NodeContextMenu'
import { PaneContextMenu, type PaneMenuState } from './PaneContextMenu'
import { CanvasToolRail } from './CanvasToolRail'
import { DrawingSurface } from './DrawingLayer'
import { TextNode } from '../nodeTypes/TextNode'
import { WhiteboardNode } from '../nodeTypes/WhiteboardNode'
import { DrawingNode } from '../nodeTypes/DrawingNode'
import { ImageNode } from '../nodeTypes/ImageNode'
import { GroupNode } from '../nodeTypes/GroupNode'
import type { LibraryItem } from '../types/libraryItem'
import { LiveScoreBadge } from './LiveScoreBadge'
import { buildEdgeLabelStyle, readCssToken } from '../utils/edgeLabelStyle'
import { relationshipKey } from '../utils/nodeVisuals'
import { parentTechniqueId } from '../../correlation/engine/buildSubtechniqueEdges'
import { useI18n } from '../../../shared/i18n'
import type { EdgeLineStyle, RelationshipType } from '../../../shared/types/investigation'
import type { ThemePreference } from '../../../shared/theme/theme'
import type { DetectionAnalytic, KnowledgeBase } from '../../../shared/types/knowledge'
import './Canvas.css'

const nodeTypes = {
  generic: GenericNode,
  text: TextNode,
  whiteboard: WhiteboardNode,
  drawing: DrawingNode,
  image: ImageNode,
  group: GroupNode,
}

/** Kinds that render as themselves rather than as an evidence card. */
const OWN_NODE_TYPES = new Set(['text', 'whiteboard', 'drawing', 'image', 'group'])

/** Kinds that are scenery: they sit behind the evidence rather than over it. */
const BACKDROP_TYPES = new Set(['whiteboard', 'group'])

/** How far the pointer may travel on a right-click before it counts as a pan. */
const CONTEXT_MENU_SLOP = 4

/** Colour and thickness of the freehand pen. */
const PEN = { color: '#f59e0b', width: 3 }

/** Longest side a pasted picture starts at, in canvas units. */
const MAX_PASTED_IMAGE = 640

function flowNodeType(type: string): string {
  return OWN_NODE_TYPES.has(type) ? type : 'generic'
}

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
  libraryItems: LibraryItem[]
  presenting: boolean
  onTogglePresentation: () => void
  /** Only for React Flow's own chrome; the switch itself lives in the header. */
  theme: ThemePreference
  onImportFile: (file: File) => void
  onSaveLocally: () => void
  onLoadDemo: () => void
}

/** The flow helpers are only available under a provider, so the canvas sits inside one. */
export function Canvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasSurface {...props} />
    </ReactFlowProvider>
  )
}

function CanvasSurface({
  knowledgeBase,
  libraryItems,
  presenting,
  onTogglePresentation,
  theme,
  onImportFile,
  onSaveLocally,
  onLoadDemo,
}: CanvasProps) {
  const { t, locale } = useI18n()
  const { screenToFlowPosition } = useReactFlow()
  const nodes = useInvestigationStore((s) => s.nodes)
  const manualEdges = useInvestigationStore((s) => s.manualEdges)
  const inferredEdges = useInvestigationStore((s) => s.inferredEdges)
  const edges = useMemo(
    () => combineEdges(inferredEdges, manualEdges),
    [inferredEdges, manualEdges],
  )
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
  const expandSubtechniques = useInvestigationStore((s) => s.expandSubtechniques)
  const collapseSubtechniques = useInvestigationStore((s) => s.collapseSubtechniques)
  const addImageNode = useInvestigationStore((s) => s.addImageNode)
  const pasteClipboard = useInvestigationStore((s) => s.pasteClipboard)
  const selectedNodeIds = useInvestigationStore((s) => s.selectedNodeIds)
  const setSelectedNodes = useInvestigationStore((s) => s.setSelectedNodes)

  /*
   * The nodes handed to React Flow are rebuilt from the store on every change,
   * so the sizes it measured would be dropped each time. Anything reading a
   * node's size off the props — the minimap above all — then sees nothing to
   * draw, so the measurements are kept here and handed back in.
   */
  const [nodeSizes, setNodeSizes] = useState<Record<string, { width: number; height: number }>>({})

  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [paneMenu, setPaneMenu] = useState<PaneMenuState | null>(null)
  const [drawing, setDrawing] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  // Where the right button went down, to tell a pan from a plain right-click.
  const rightPressAt = useRef<{ x: number; y: number } | null>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  /** Whether the pointer that is acting was carrying a multi-select modifier. */
  const addToSelection = useRef(false)

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

  const subtechniquesByParent = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const technique of knowledgeBase?.techniques ?? []) {
      const parentId = parentTechniqueId(technique.id)
      if (!parentId) continue
      map.set(parentId, [...(map.get(parentId) ?? []), technique.id])
    }
    return map
  }, [knowledgeBase])

  const definitionsOnCanvas = useMemo(() => new Set(nodes.map((n) => n.definitionId)), [nodes])
  const selectedIds = useMemo(() => new Set(selectedNodeIds), [selectedNodeIds])

  /*
   * A picture in the clipboard becomes an element; anything else falls through
   * to the node clipboard handled by the keyboard shortcuts.
   */
  useEffect(() => {
    async function handlePaste(event: ClipboardEvent) {
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || /INPUT|TEXTAREA/.test(target.tagName))
      ) {
        return
      }
      const file = [...(event.clipboardData?.items ?? [])]
        .filter((item) => item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .find((item): item is File => item !== null)

      // No picture: this is the other half of Ctrl+C on the canvas.
      if (!file) {
        if (pasteClipboard() > 0) event.preventDefault()
        return
      }

      event.preventDefault()
      const src = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
      const size = await new Promise<{ width: number; height: number }>((resolve) => {
        const image = new Image()
        image.onload = () => {
          // Big screenshots would swamp the canvas, so cap the long side.
          const scale = Math.min(1, MAX_PASTED_IMAGE / Math.max(image.width, image.height))
          resolve({ width: image.width * scale, height: image.height * scale })
        }
        image.onerror = () => resolve({ width: 320, height: 200 })
        image.src = src
      })

      addImageNode({
        src,
        position: screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 }),
        size,
      })
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [addImageNode, pasteClipboard, screenToFlowPosition])

  // Escape leaves drawing mode, whatever else has focus.
  useEffect(() => {
    if (!drawing) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setDrawing(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [drawing])

  useEffect(() => {
    if (!feedback) return
    const timer = window.setTimeout(() => setFeedback(null), 5000)
    return () => window.clearTimeout(timer)
  }, [feedback])

  const handleExpandSubtechniques = useCallback(
    (nodeId: string) => {
      if (!knowledgeBase) return
      expandSubtechniques(nodeId, knowledgeBase, locale)
    },
    [expandSubtechniques, knowledgeBase, locale],
  )

  const flowNodes: Node<GenericNodeData>[] = useMemo(
    () =>
      nodes.map((n) => ({
        id: n.id,
        type: flowNodeType(n.type),
        position: n.position,
        selected: selectedIds.has(n.id),
        measured: nodeSizes[n.id],
        parentId: n.parentId,
        // A backdrop starts behind; anything can then be restacked by hand.
        zIndex: n.layer ?? (BACKDROP_TYPES.has(n.type) ? -1 : 0),
        width: n.size?.width,
        height: n.size?.height,
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
          missingSubtechniques:
            n.type === 'mitre_technique'
              ? (subtechniquesByParent.get(n.definitionId) ?? []).filter(
                  (id) => !definitionsOnCanvas.has(id),
                ).length
              : 0,
          presentSubtechniques:
            n.type === 'mitre_technique'
              ? (subtechniquesByParent.get(n.definitionId) ?? []).filter((id) =>
                  definitionsOnCanvas.has(id),
                ).length
              : 0,
          onExpandSubtechniques: handleExpandSubtechniques,
          onCollapseSubtechniques: collapseSubtechniques,
          width: n.size?.width ?? 0,
          height: n.size?.height ?? 0,
          // Drawings and images carry their own payload.
          points: n.stroke?.points ?? [],
          color: n.stroke?.color ?? '',
          strokeWidth: n.stroke?.width ?? 1,
          boxWidth: n.size?.width ?? 0,
          boxHeight: n.size?.height ?? 0,
          src: n.imageSrc ?? '',
        },
      })),
    [
      nodes,
      selectedIds,
      analyticsByDefinition,
      selectedAnalytic,
      nodeSizes,
      subtechniquesByParent,
      definitionsOnCanvas,
      handleExpandSubtechniques,
      collapseSubtechniques,
    ],
  )

  const flowEdges: Edge<FlowEdgeData>[] = useMemo(() => {
    const labelStyle = buildEdgeLabelStyle(readCssToken)
    return edges.map((e) => {
      const stroke = e.color ?? (e.automatic ? AUTOMATIC_EDGE_COLOR : MANUAL_EDGE_COLOR)
      const dashed = e.lineStyle ? e.lineStyle === 'dashed' : e.automatic
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        label: e.label,
        labelStyle,
        labelShowBg: false,
        selected: e.id === selectedEdgeId,
        reconnectable: !e.automatic,
        data: { automatic: e.automatic, type: e.type },
        markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
        style: { stroke, strokeDasharray: dashed ? '4 3' : undefined },
      }
    })
  }, [edges, selectedEdgeId])

  const onNodesChange: OnNodesChange<Node<GenericNodeData>> = useCallback(
    (changes: NodeChange<Node<GenericNodeData>>[]) => {
      /*
       * With `nodes` handed in as a prop, React Flow reports selection instead
       * of owning it: its own click, ctrl-click and marquee all arrive here as
       * `select` changes, and unless they are applied the next render puts the
       * old selection straight back.
       */
      const selectChanges = changes.filter((change) => change.type === 'select')
      if (selectChanges.length > 0) {
        const selected = new Set(useInvestigationStore.getState().selectedNodeIds)

        if (addToSelection.current) {
          /*
           * Ctrl-click. React Flow decides on multi-select from a key it saw
           * pressed, which misses a click that merely carries the modifier, so
           * it clears the rest of the selection in the same breath. Only the
           * element actually clicked is honoured here, and clicking it again
           * takes it back out.
           */
          for (const change of selectChanges) {
            if (!change.selected) continue
            if (selected.has(change.id)) selected.delete(change.id)
            else selected.add(change.id)
          }
        } else {
          for (const change of selectChanges) {
            if (change.selected) selected.add(change.id)
            else selected.delete(change.id)
          }
        }

        setSelectedNodes([...selected])
      }

      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          moveNode(change.id, change.position)
        }
        if (change.type === 'remove') {
          removeNode(change.id)
          setNodeSizes(({ [change.id]: _removed, ...rest }) => rest)
        }
        if (change.type === 'dimensions' && change.dimensions) {
          const { width, height } = change.dimensions
          setNodeSizes((sizes) => {
            const current = sizes[change.id]
            if (current?.width === width && current?.height === height) return sizes
            return { ...sizes, [change.id]: { width, height } }
          })
        }
      }
    },
    [moveNode, removeNode, setSelectedNodes],
  )

  // One undo step per drag, not one per animation frame.
  const onNodeDragStart = useCallback(() => {
    pushHistory()
  }, [pushHistory])

  /*
   * Selection is React Flow's to manage: it already understands click,
   * ctrl-click to add and the marquee, and it reports the result through
   * onSelectionChange. Forcing a single node here would undo a ctrl-click.
   */

  const onPaneClick = useCallback(() => {
    selectNode(null)
    setSelectedEdgeId(null)
    setCommentEditor(null)
    setContextMenu(null)
    setPaneMenu(null)
  }, [selectNode])

  /*
   * The right button does double duty: dragging pans the canvas, a plain click
   * opens the menu. React Flow swallows its own pane context-menu callback once
   * the right button is a pan button, so the event is taken from the DOM here,
   * and the menu only opens when the pointer stayed put between press and
   * release.
   */
  useEffect(() => {
    const area = areaRef.current
    if (!area) return

    function handleMouseDown(event: MouseEvent) {
      if (event.button === 2) rightPressAt.current = { x: event.clientX, y: event.clientY }
      addToSelection.current = event.ctrlKey || event.metaKey || event.shiftKey
    }

    function handleContextMenu(event: MouseEvent) {
      const target = event.target as HTMLElement | null
      // Only empty canvas: nodes, edges and the panels have their own menus.
      if (!target?.classList.contains('react-flow__pane')) return
      event.preventDefault()

      const press = rightPressAt.current
      rightPressAt.current = null
      if (
        press &&
        (Math.abs(press.x - event.clientX) > CONTEXT_MENU_SLOP ||
          Math.abs(press.y - event.clientY) > CONTEXT_MENU_SLOP)
      ) {
        return
      }

      const spot = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      setContextMenu(null)
      setPaneMenu({ x: event.clientX, y: event.clientY, flowX: spot.x, flowY: spot.y })
    }

    /*
     * Capture phase: React Flow stops the press from bubbling once it starts
     * dragging a node, and the modifier has to be read before that happens.
     */
    area.addEventListener('mousedown', handleMouseDown, true)
    area.addEventListener('contextmenu', handleContextMenu)
    return () => {
      area.removeEventListener('mousedown', handleMouseDown, true)
      area.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [screenToFlowPosition])

  const onNodeContextMenu: NodeMouseHandler<Node<GenericNodeData>> = useCallback(
    (event, node) => {
      event.preventDefault()
      selectNode(node.id)
      setContextMenu({ nodeId: node.id, x: event.clientX, y: event.clientY })
    },
    [selectNode],
  )

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
    <div className="canvas-area" role="application" aria-label={t('canvas.label')} ref={areaRef}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onReconnect={onReconnect}
        onNodeDragStart={onNodeDragStart}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onPaneClick={onPaneClick}
        colorMode={theme}
        /* Selecting must not lift the whiteboard over the evidence sitting on it. */
        elevateNodesOnSelect={false}
        connectionMode={ConnectionMode.Loose}
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
        /* Left button draws a selection box; the right one drags the canvas. */
        selectionOnDrag={!drawing}
        panOnDrag={[2]}
        selectionKeyCode={null}
        fitView
      >
        <Panel position="top-left">
          <CanvasToolRail
            knowledgeBase={knowledgeBase}
            drawing={drawing}
            onSetDrawing={setDrawing}
            presenting={presenting}
            onTogglePresentation={onTogglePresentation}
            onStatus={setFeedback}
            onImportFile={onImportFile}
            onSaveLocally={onSaveLocally}
            onLoadDemo={onLoadDemo}
          />
        </Panel>
        <Panel position="top-center">
          <LiveScoreBadge knowledgeBase={knowledgeBase} />
        </Panel>
        <Panel position="top-right">
          <CanvasActions feedback={feedback} />
        </Panel>
        <Background />
        <Controls />
        <MiniMap pannable zoomable />
        {drawing && <DrawingSurface color={PEN.color} width={PEN.width} />}
      </ReactFlow>

      {contextMenu && (
        <NodeContextMenu
          menu={contextMenu}
          knowledgeBase={knowledgeBase}
          onClose={() => setContextMenu(null)}
        />
      )}

      {paneMenu && (
        <PaneContextMenu menu={paneMenu} items={libraryItems} onClose={() => setPaneMenu(null)} />
      )}

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
