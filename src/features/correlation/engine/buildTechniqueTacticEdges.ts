import type { InvestigationEdge, InvestigationNode } from '../../../shared/types/investigation'
import type { MitreTechnique } from '../../../shared/types/knowledge'
import { translate, type Locale } from '../../../shared/i18n'
import type { HandleId } from '../../../shared/types/handles'

// Auto link drops techniques and tactics side by side on the grid, so a
// straight right-to-left connector reads better than looping under the nodes.
// The matrix layout stacks them vertically instead and overrides these.
const DEFAULT_HANDLES: EdgeHandles = { source: 'right', target: 'left' }

export interface EdgeHandles {
  source: HandleId
  target: HandleId
}

function isTechniqueNode(node: InvestigationNode): boolean {
  return node.type === 'mitre_technique' || node.type === 'mitre_subtechnique'
}

export function techniqueTacticEdgeId(techniqueNodeId: string, tacticNodeId: string): string {
  return `tactic-${techniqueNodeId}-${tacticNodeId}`
}

/**
 * Builds a connection from every technique on the canvas to each of its tactics
 * that is also present.
 *
 * The Auto link action runs this once and stores the result as ordinary
 * connections rather than re-deriving them every tick, so the analyst can
 * restyle them, drag their endpoints to another side or delete them and have
 * that stick.
 */
export function buildTechniqueTacticEdges(
  nodes: InvestigationNode[],
  techniques: MitreTechnique[],
  locale: Locale,
  handles: EdgeHandles = DEFAULT_HANDLES,
): InvestigationEdge[] {
  const tacticNodes = nodes.filter((n) => n.type === 'mitre_tactic')
  if (tacticNodes.length === 0) return []

  const techniquesById = new Map(techniques.map((t) => [t.id, t]))
  const label = translate(locale, 'relationship.maps_to')
  const edges: InvestigationEdge[] = []

  for (const node of nodes.filter(isTechniqueNode)) {
    const definition = techniquesById.get(node.definitionId)
    if (!definition) continue

    for (const tacticId of definition.tactics) {
      const tacticNode = tacticNodes.find((t) => t.definitionId === tacticId)
      if (!tacticNode) continue

      edges.push({
        id: techniqueTacticEdgeId(node.id, tacticNode.id),
        source: node.id,
        target: tacticNode.id,
        sourceHandle: handles.source,
        targetHandle: handles.target,
        type: 'maps_to',
        label,
        automatic: false,
        explanation: `${node.label} -> ${tacticNode.label}`,
      })
    }
  }

  return edges
}
