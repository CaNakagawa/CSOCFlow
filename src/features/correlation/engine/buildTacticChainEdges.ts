import type { InvestigationEdge, InvestigationNode } from '../../../shared/types/investigation'
import type { MitreTactic } from '../../../shared/types/knowledge'
import type { HandleId } from '../../../shared/types/handles'

// Tactics are the only thing laid out side by side, so they chain left to right.
const SOURCE_HANDLE: HandleId = 'right'
const TARGET_HANDLE: HandleId = 'left'

export function tacticChainEdgeId(fromNodeId: string, toNodeId: string): string {
  return `tactic-chain-${fromNodeId}-${toNodeId}`
}

/**
 * Chains the tactics present on the canvas in matrix order, each to the next.
 *
 * The matrix is ordered by adversary progression, so the chain expresses that
 * ordering — not a claim that these steps happened in this incident. Gaps are
 * skipped: with only Persistence and Impact present they connect directly.
 */
export function buildTacticChainEdges(
  nodes: InvestigationNode[],
  tactics: MitreTactic[],
): InvestigationEdge[] {
  const position = new Map(tactics.map((tactic, index) => [tactic.id, index]))

  const tacticNodes = nodes
    .filter((n) => n.type === 'mitre_tactic' && position.has(n.definitionId))
    .sort((a, b) => position.get(a.definitionId)! - position.get(b.definitionId)!)

  const edges: InvestigationEdge[] = []

  for (let i = 0; i < tacticNodes.length - 1; i += 1) {
    const from = tacticNodes[i]
    const to = tacticNodes[i + 1]
    edges.push({
      id: tacticChainEdgeId(from.id, to.id),
      source: from.id,
      target: to.id,
      sourceHandle: SOURCE_HANDLE,
      targetHandle: TARGET_HANDLE,
      type: 'occurred_before',
      // Deliberately unlabelled: a row of tactics each captioned "occurred
      // before" is noise. The relationship is still there in the edge editor.
      automatic: false,
      explanation: `${from.label} -> ${to.label}`,
    })
  }

  return edges
}
