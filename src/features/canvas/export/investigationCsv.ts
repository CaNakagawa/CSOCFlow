import type { Investigation } from '../../../shared/types/investigation'

const COLUMNS = ['kind', 'id', 'type', 'label', 'state', 'source', 'target', 'notes'] as const

/** Wraps a field for CSV: quotes always, doubled quotes inside. */
function cell(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

/**
 * The investigation as one flat table.
 *
 * Elements and connections share the sheet with a `kind` column, so a
 * spreadsheet or a SIEM import sees the whole graph in a single file rather
 * than two that have to be joined by hand.
 */
export function investigationToCsv(doc: Investigation): string {
  const rows = [COLUMNS.join(',')]

  for (const node of doc.canvas.nodes) {
    rows.push(
      [
        cell('element'),
        cell(node.definitionId),
        cell(node.type),
        cell(node.label),
        cell(node.state),
        cell(''),
        cell(''),
        cell(node.notes ?? ''),
      ].join(','),
    )
  }

  const labelById = new Map(doc.canvas.nodes.map((n) => [n.id, n.label]))
  for (const edge of doc.canvas.edges) {
    rows.push(
      [
        cell('connection'),
        cell(edge.id),
        cell(edge.type),
        cell(edge.label ?? ''),
        cell(''),
        cell(labelById.get(edge.source) ?? edge.source),
        cell(labelById.get(edge.target) ?? edge.target),
        cell(edge.explanation ?? ''),
      ].join(','),
    )
  }

  // A trailing newline keeps the last row intact for line-based readers.
  return `${rows.join('\n')}\n`
}
