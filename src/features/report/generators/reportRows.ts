import { buildAttackTimeline, canJoinTimeline } from '../../timeline/utils/attackTimeline'
import type { Investigation, InvestigationNode } from '../../../shared/types/investigation'

/** One line of the element table, already turned into text. */
export interface ElementRow {
  /** The timeline position, as an ordinal the reader recognises, or blank. */
  step: string
  time: string
  type: string
  label: string
  state: string
  connections: string
  notes: string
}

export interface ConnectionRow {
  from: string
  to: string
  type: string
  label: string
  explanation: string
}

export interface ReportTables {
  elements: ElementRow[]
  connections: ConnectionRow[]
}

export interface RowLabels {
  /** Names the element's category and its investigative state. */
  type: (type: string) => string
  state: (state: string) => string
  connection: (type: string) => string
}

/**
 * The investigation as two flat tables.
 *
 * Written once and used twice: the spreadsheet an analyst opens in Excel and
 * the table inside the executive report are the same rows, so the two can
 * never drift apart and disagree in a meeting.
 *
 * Elements come out in the order of the story where there is one, and the rest
 * after it: a reader follows the sequence, not the order things were dropped
 * onto the canvas.
 */
export function buildReportTables(doc: Investigation, labels: RowLabels): ReportTables {
  const nodes = doc.canvas.nodes
  const timeline = buildAttackTimeline(nodes)

  const ordered: { node: InvestigationNode; step: number | null }[] = []
  timeline.steps.forEach((column, index) => {
    for (const node of column.entries) ordered.push({ node, step: index + 1 })
  })
  for (const node of nodes) {
    if (ordered.some((entry) => entry.node.id === node.id)) continue
    ordered.push({ node, step: null })
  }

  const labelById = new Map(nodes.map((n) => [n.id, n.label]))
  const linksOf = new Map<string, string[]>()
  for (const edge of doc.canvas.edges) {
    const from = labelById.get(edge.source) ?? edge.source
    const to = labelById.get(edge.target) ?? edge.target
    linksOf.set(edge.source, [...(linksOf.get(edge.source) ?? []), `→ ${to}`])
    linksOf.set(edge.target, [...(linksOf.get(edge.target) ?? []), `← ${from}`])
  }

  return {
    elements: ordered.map(({ node, step }) => ({
      step: step === null ? '' : String(step),
      time: node.eventAt ?? '',
      type: labels.type(node.type),
      label: node.label,
      state: labels.state(node.state),
      connections: (linksOf.get(node.id) ?? []).join('; '),
      notes: node.notes ?? '',
    })),
    connections: doc.canvas.edges.map((edge) => ({
      from: labelById.get(edge.source) ?? edge.source,
      to: labelById.get(edge.target) ?? edge.target,
      type: labels.connection(edge.type),
      label: edge.label ?? '',
      explanation: edge.explanation ?? '',
    })),
  }
}

/** Whether this element belongs in the story at all, for the report's counts. */
export { canJoinTimeline }
