import { buildReportTables, type ReportTables, type RowLabels } from './reportRows'
import type { Investigation } from '../../../shared/types/investigation'

export interface ReportCopy {
  title: string
  caseLabel: string
  analyst: string
  date: string
  /** The date itself, already formatted for the reader's locale. */
  dateValue: string
  statusLabel: string
  conclusionLabel: string
  summary: string
  scoreLabel: string
  scoreOutOf: string
  reach: string
  sequence: string
  elements: string
  connections: string
  noSequence: string
  noConnections: string
  columns: {
    step: string
    time: string
    type: string
    label: string
    state: string
    connections: string
    notes: string
    from: string
    to: string
    explanation: string
  }
}

export interface ReportFacts {
  status: string
  conclusion: string
  /** 0..100, as the canvas reads it. */
  score: number
  /** How far along the kill chain confirmed activity reaches. */
  reach: string
  /** The steps of the attack, already ordered and named. */
  steps: { ordinal: number; entries: { label: string; time: string; state: string }[] }[]
}

/** Escapes text going into the report, which is built as HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function table(headers: string[], rows: string[][], emptyNote?: string): string {
  if (rows.length === 0) return emptyNote ? `<p class="empty">${escapeHtml(emptyNote)}</p>` : ''
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')
  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`)
    .join('')
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
}

/**
 * The investigation as a document to hand upward.
 *
 * Built as plain HTML rather than React because it is never interacted with:
 * it is rendered once, off-screen, and turned into a picture for a PDF or a
 * slide. Keeping it a pure string also means the whole report can be asserted
 * in a test without a browser.
 *
 * The layout is fixed at A4 width so a page break falls where it is expected
 * rather than wherever the analyst's window happened to end.
 */
export type ReportSection = 'summary' | 'sequence' | 'elements' | 'connections'

export const FULL_REPORT: ReportSection[] = ['summary', 'sequence', 'elements', 'connections']

/** Just the story: the same document with everything but the sequence removed. */
export const TIMELINE_SHEET: ReportSection[] = ['sequence']

export function buildExecutiveReport(
  doc: Investigation,
  facts: ReportFacts,
  copy: ReportCopy,
  labels: RowLabels,
  sections: ReportSection[] = FULL_REPORT,
): string {
  const tables: ReportTables = buildReportTables(doc, labels)
  const meta = doc.investigation

  const sequence =
    facts.steps.length === 0
      ? `<p class="empty">${escapeHtml(copy.noSequence)}</p>`
      : `<ol class="steps">${facts.steps
          .map(
            (step) =>
              `<li><span class="ordinal">${step.ordinal}</span><div>${step.entries
                .map(
                  (entry) =>
                    `<p class="entry"><strong>${escapeHtml(entry.label)}</strong>` +
                    `${entry.time ? `<span class="time">${escapeHtml(entry.time)}</span>` : ''}` +
                    `<span class="state">${escapeHtml(entry.state)}</span></p>`,
                )
                .join('')}</div></li>`,
          )
          .join('')}</ol>`

  return `<div class="report">
  <header>
    <h1>${escapeHtml(meta.title || copy.title)}</h1>
    <dl>
      <div><dt>${escapeHtml(copy.caseLabel)}</dt><dd>${escapeHtml(meta.caseId || '—')}</dd></div>
      <div><dt>${escapeHtml(copy.analyst)}</dt><dd>${escapeHtml(meta.analyst || '—')}</dd></div>
      <div><dt>${escapeHtml(copy.date)}</dt><dd>${escapeHtml(copy.dateValue)}</dd></div>
      <div><dt>${escapeHtml(copy.statusLabel)}</dt><dd>${escapeHtml(facts.status)}</dd></div>
      <div><dt>${escapeHtml(copy.conclusionLabel)}</dt><dd>${escapeHtml(facts.conclusion)}</dd></div>
    </dl>
  </header>

  <section class="score">
    <div class="score__value"><strong>${facts.score}</strong><span>${escapeHtml(copy.scoreOutOf)}</span></div>
    <div>
      <h2>${escapeHtml(copy.scoreLabel)}</h2>
      <p>${escapeHtml(facts.reach)}</p>
    </div>
  </section>

  ${
    sections.includes('summary') && meta.description?.trim()
      ? `<section><h2>${escapeHtml(copy.summary)}</h2><p>${escapeHtml(meta.description)}</p></section>`
      : ''
  }

  ${
    sections.includes('sequence')
      ? `<section><h2>${escapeHtml(copy.sequence)}</h2>${sequence}</section>`
      : ''
  }

  ${
    sections.includes('elements')
      ? `<section>
    <h2>${escapeHtml(copy.elements)}</h2>
    ${table(
      [
        copy.columns.step,
        copy.columns.time,
        copy.columns.type,
        copy.columns.label,
        copy.columns.state,
        copy.columns.connections,
        copy.columns.notes,
      ],
      tables.elements.map((row) => [
        row.step,
        row.time,
        row.type,
        row.label,
        row.state,
        row.connections,
        row.notes,
      ]),
    )}
  </section>`
      : ''
  }

  ${
    sections.includes('connections')
      ? `<section>
    <h2>${escapeHtml(copy.connections)}</h2>
    ${
      /* No label column: a connection's label is its type spelled out, and two
         identical columns side by side read as a mistake. */ ''
    }
    ${table(
      [copy.columns.from, copy.columns.to, copy.columns.type, copy.columns.explanation],
      tables.connections.map((row) => [row.from, row.to, row.type, row.explanation]),
      copy.noConnections,
    )}
  </section>`
      : ''
  }
</div>`
}
