import type { InvestigationEdge, InvestigationNode } from '../../../shared/types/investigation'
import type { RelationshipRule } from '../../../shared/types/knowledge'

const AUTOMATIC_EDGE_CONFIDENCE = 90

function normalize(value: unknown): string {
  return String(value).toLowerCase()
}

function fieldsEqual(a: unknown, b: unknown): boolean {
  if (a === undefined || a === null || b === undefined || b === null) return false
  if (Array.isArray(a)) return a.some((item) => normalize(item) === normalize(b))
  if (Array.isArray(b)) return b.some((item) => normalize(item) === normalize(a))
  return normalize(a) === normalize(b)
}

export function inferRelationships(
  nodes: InvestigationNode[],
  rules: RelationshipRule[],
): InvestigationEdge[] {
  const edges: InvestigationEdge[] = []

  for (const rule of rules) {
    const sourceNodes = nodes.filter((n) => n.type === rule.from)
    const targetNodes = nodes.filter((n) => n.type === rule.to)

    for (const source of sourceNodes) {
      for (const target of targetNodes) {
        if (source.id === target.id) continue
        const sourceValue = source.fields[rule.match.sourceField]
        const targetValue = target.fields[rule.match.targetField]
        if (!fieldsEqual(sourceValue, targetValue)) continue

        edges.push({
          id: `auto-${rule.id}-${source.id}-${target.id}`,
          source: source.id,
          target: target.id,
          type: rule.type,
          label: rule.label,
          automatic: true,
          confidence: AUTOMATIC_EDGE_CONFIDENCE,
          explanation: rule.explanation,
        })
      }
    }
  }

  return edges
}
