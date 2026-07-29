import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type OnNodesChange,
  type NodeChange,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { combineEdges, useInvestigationStore } from '../../investigation/store/investigationStore'
import { GenericNode, type GenericNodeData } from '../nodeTypes/GenericNode'

const nodeTypes = { generic: GenericNode }

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

  const flowEdges: Edge[] = useMemo(
    () =>
      edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        style: e.automatic ? { strokeDasharray: '4 3', stroke: '#64748b' } : { stroke: '#3b82f6' },
      })),
    [edges],
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

  const onPaneClick = useCallback(() => selectNode(null), [selectNode])

  return (
    <div className="canvas-area" role="application" aria-label="Canvas de investigação">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  )
}
