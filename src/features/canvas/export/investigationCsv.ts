import { buildReportTables, type RowLabels } from '../../report/generators/reportRows'
import type { Investigation } from '../../../shared/types/investigation'

const COLUMNS = [
  'kind',
  'step',
  'time',
  'type',
  'label',
  'state',
  'from',
  'to',
  'connections',
  'notes',
] as const

/** Wraps a field for CSV: quotes always, doubled quotes inside. */
function cell(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

/**
 * Excel reads a CSV as the system codepage unless the file says otherwise, and
 * a byte order mark is the only thing it takes as saying otherwise. Without it
 * every accented character in a Portuguese or German investigation opens
 * mangled.
 */
export const CSV_BOM = '﻿'

/**
 * The investigation as one flat table, in the order of the story.
 *
 * Elements and connections share the sheet with a `kind` column, so a
 * spreadsheet or a SIEM import sees the whole graph in a single file rather
 * than two that have to be joined by hand. The rows are the same ones the
 * executive report prints, so the sheet and the document can never disagree.
 */
export function investigationToCsv(doc: Investigation, labels?: RowLabels): string {
  // Raw identifiers when no dictionary is handed in: a sheet is read by tools
  // as often as by people, and an untranslated value is at least unambiguous.
  const rowLabels: RowLabels = labels ?? {
    type: (type) => type,
    state: (state) => state,
    connection: (type) => type,
  }
  const tables = buildReportTables(doc, rowLabels)
  const rows = [COLUMNS.join(',')]

  for (const element of tables.elements) {
    rows.push(
      [
        cell('element'),
        cell(element.step),
        cell(element.time),
        cell(element.type),
        cell(element.label),
        cell(element.state),
        cell(''),
        cell(''),
        cell(element.connections),
        cell(element.notes),
      ].join(','),
    )
  }

  for (const connection of tables.connections) {
    rows.push(
      [
        cell('connection'),
        cell(''),
        cell(''),
        cell(connection.type),
        cell(connection.label),
        cell(''),
        cell(connection.from),
        cell(connection.to),
        cell(''),
        cell(connection.explanation),
      ].join(','),
    )
  }

  // A trailing newline keeps the last row intact for line-based readers.
  return `${CSV_BOM}${rows.join('\n')}\n`
}
