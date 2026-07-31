import type { InvestigationEdge, InvestigationNode } from '../../../shared/types/investigation'
import { translate, type Locale } from '../../../shared/i18n'
import type { HandleId } from '../../../shared/types/handles'

// Parent above, subtechnique below, so the hierarchy reads top down.
const SOURCE_HANDLE: HandleId = 'bottom'
const TARGET_HANDLE: HandleId = 'top'

function isTechniqueNode(node: InvestigationNode): boolean {
  return node.type === 'mitre_technique' || node.type === 'mitre_subtechnique'
}

/** `T1110.001` belongs to `T1110`; a parent technique id has no dot. */
export function parentTechniqueId(techniqueId: string): string | null {
  const separator = techniqueId.indexOf('.')
  return separator === -1 ? null : techniqueId.slice(0, separator)
}

export function subtechniqueEdgeId(parentNodeId: string, subNodeId: string): string {
  return `subtechnique-${parentNodeId}-${subNodeId}`
}

/**
 * Connects each subtechnique on the canvas to its parent technique, when both
 * are present.
 *
 * Like the tactic links these are ordinary connections rather than derived
 * ones, so the analyst can restyle them, move their endpoints or delete them.
 */
export function buildSubtechniqueEdges(
  nodes: InvestigationNode[],
  locale: Locale,
): InvestigationEdge[] {
  const techniqueNodes = nodes.filter(isTechniqueNode)
  const label = translate(locale, 'relationship.parent_of')
  const edges: InvestigationEdge[] = []

  for (const subtechnique of techniqueNodes) {
    const parentId = parentTechniqueId(subtechnique.definitionId)
    if (!parentId) continue

    const parent = techniqueNodes.find((n) => n.definitionId === parentId)
    if (!parent) continue

    edges.push({
      id: subtechniqueEdgeId(parent.id, subtechnique.id),
      source: parent.id,
      target: subtechnique.id,
      sourceHandle: SOURCE_HANDLE,
      targetHandle: TARGET_HANDLE,
      type: 'parent_of',
      label,
      automatic: false,
      explanation: `${parent.label} -> ${subtechnique.label}`,
    })
  }

  return edges
}
