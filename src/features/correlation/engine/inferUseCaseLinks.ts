import type { InvestigationEdge, InvestigationNode } from '../../../shared/types/investigation'
import type { UseCaseDefinition } from '../../../shared/types/knowledge'
import { localize, translate, type Locale } from '../../../shared/i18n'
import type { SourceHandleId, TargetHandleId } from '../../../shared/types/handles'

const USE_CASE_LINK_CONFIDENCE = 100

const SOURCE_HANDLE: SourceHandleId = 'bottom'
const TARGET_HANDLE: TargetHandleId = 'top'

function isTechniqueNode(node: InvestigationNode): boolean {
  return node.type === 'mitre_technique' || node.type === 'mitre_subtechnique'
}

export function inferUseCaseLinks(
  nodes: InvestigationNode[],
  useCases: UseCaseDefinition[],
  locale: Locale,
): InvestigationEdge[] {
  const useCasesById = new Map(useCases.map((u) => [u.id, u]))
  const techniqueNodes = nodes.filter(isTechniqueNode)
  const edges: InvestigationEdge[] = []

  for (const node of nodes.filter((n) => n.type === 'detection_use_case')) {
    const definition = useCasesById.get(node.definitionId)
    if (!definition) continue

    for (const techniqueId of definition.techniques) {
      const techniqueNode = techniqueNodes.find((t) => t.definitionId === techniqueId)
      if (!techniqueNode) continue

      edges.push({
        id: `usecase-${node.id}-${techniqueNode.id}`,
        source: node.id,
        target: techniqueNode.id,
        sourceHandle: SOURCE_HANDLE,
        targetHandle: TARGET_HANDLE,
        type: 'maps_to',
        label: translate(locale, 'relationship.maps_to'),
        automatic: true,
        confidence: USE_CASE_LINK_CONFIDENCE,
        explanation: `${localize(definition.name, locale)} -> ${techniqueNode.label}`,
      })
    }
  }

  return edges
}
