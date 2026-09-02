import { describe, expect, it } from 'vitest'
import {
  buildExecutiveReport,
  escapeHtml,
  type ReportCopy,
  type ReportFacts,
} from './executiveReport'
import { buildReportTables, type RowLabels } from './reportRows'
import type { Investigation, InvestigationNode } from '../../../shared/types/investigation'

const labels: RowLabels = {
  type: (type) => `type:${type}`,
  state: (state) => `state:${state}`,
  connection: (type) => `link:${type}`,
}

const copy: ReportCopy = {
  title: 'Investigation',
  caseLabel: 'Case',
  analyst: 'Analyst',
  date: 'Date',
  dateValue: '14 March 2026',
  statusLabel: 'Status',
  conclusionLabel: 'Conclusion',
  summary: 'Summary',
  scoreLabel: 'Investigation score',
  scoreOutOf: 'out of 100',
  reach: 'Reach',
  sequence: 'What happened',
  elements: 'Elements',
  connections: 'Connections',
  noSequence: 'No sequence yet.',
  noConnections: 'No connections.',
  columns: {
    step: 'Step',
    time: 'Time',
    type: 'Type',
    label: 'Element',
    state: 'State',
    connections: 'Connected to',
    notes: 'Notes',
    from: 'From',
    to: 'To',
    explanation: 'Why',
  },
}

const facts: ReportFacts = {
  status: 'Open',
  conclusion: 'Inconclusive',
  score: 62,
  reach: 'Confirmed activity reaches Credential Access.',
  steps: [
    { ordinal: 1, entries: [{ label: 'Failed logins', time: '09:15', state: 'Suspicious' }] },
    { ordinal: 2, entries: [{ label: 'Successful login', time: '', state: 'Confirmed' }] },
  ],
}

function node(partial: Partial<InvestigationNode> & { id: string }): InvestigationNode {
  return {
    definitionId: 'T1110',
    type: 'mitre_technique',
    label: partial.id,
    state: 'unknown',
    position: { x: 0, y: 0 },
    fields: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

function investigation(canvas: Partial<Investigation['canvas']> = {}): Investigation {
  return {
    schemaVersion: '1.0.0',
    applicationVersion: '0.1.0',
    investigation: {
      id: 'inv-1',
      title: 'SSH brute force',
      caseId: 'CASE-7',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      analyst: 'C. Nakagawa',
      description: 'A burst of failures then one success.',
      status: 'open',
      conclusion: null,
    },
    canvas: { viewport: { x: 0, y: 0, zoom: 1 }, nodes: [], edges: [], ...canvas },
    hypotheses: [],
    timeline: [],
    report: { analystNotes: '', recommendations: [] },
  }
}

describe('buildExecutiveReport', () => {
  it('heads the report with the case, the analyst and the verdict', () => {
    const html = buildExecutiveReport(investigation(), facts, copy, labels)

    expect(html).toContain('SSH brute force')
    expect(html).toContain('CASE-7')
    expect(html).toContain('C. Nakagawa')
    expect(html).toContain('14 March 2026')
    expect(html).toContain('Inconclusive')
  })

  it('leads with the score and how far the attack reached', () => {
    const html = buildExecutiveReport(investigation(), facts, copy, labels)

    expect(html).toContain('<strong>62</strong>')
    expect(html).toContain('Confirmed activity reaches Credential Access.')
  })

  it('tells the sequence in numbered steps, with the times', () => {
    const html = buildExecutiveReport(investigation(), facts, copy, labels)

    expect(html).toContain('Failed logins')
    expect(html).toContain('09:15')
    expect(html).toContain('Successful login')
  })

  it('says so plainly when no sequence has been set', () => {
    const html = buildExecutiveReport(investigation(), { ...facts, steps: [] }, copy, labels)

    expect(html).toContain('No sequence yet.')
  })

  it('tables every element with its details', () => {
    const html = buildExecutiveReport(
      investigation({
        nodes: [
          node({ id: 'a', label: 'Failed logins', step: 1, eventAt: '09:15', notes: 'x40' }),
          node({ id: 'b', label: 'Successful login', step: 2 }),
        ],
      }),
      facts,
      copy,
      labels,
    )

    expect(html).toContain('<th>Step</th>')
    expect(html).toContain('<td>Failed logins</td>')
    expect(html).toContain('<td>09:15</td>')
    expect(html).toContain('<td>x40</td>')
    expect(html).toContain('state:unknown')
  })

  it('tables the connections, or says there are none', () => {
    const withNone = buildExecutiveReport(investigation(), facts, copy, labels)
    expect(withNone).toContain('No connections.')

    const withOne = buildExecutiveReport(
      investigation({
        nodes: [node({ id: 'a', label: 'Alert' }), node({ id: 'b', label: 'Host' })],
        edges: [
          {
            id: 'e1',
            source: 'a',
            target: 'b',
            type: 'occurred_before',
            automatic: false,
            explanation: 'the alert came first',
          },
        ],
      }),
      facts,
      copy,
      labels,
    )
    expect(withOne).toContain('<td>Alert</td>')
    expect(withOne).toContain('the alert came first')
    expect(withOne).toContain('link:occurred_before')
  })

  it('cannot be broken by a label with markup in it', () => {
    const html = buildExecutiveReport(
      investigation({ nodes: [node({ id: 'a', label: '<script>alert(1)</script>' })] }),
      facts,
      copy,
      labels,
    )

    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('leaves out the summary when the investigation has no description', () => {
    const doc = investigation()
    doc.investigation.description = '   '
    const html = buildExecutiveReport(doc, facts, copy, labels)

    expect(html).not.toContain('Summary')
  })
})

describe('buildReportTables', () => {
  it('puts the story first and everything else after it', () => {
    const tables = buildReportTables(
      investigation({
        nodes: [
          node({ id: 'loose', label: 'Loose end' }),
          node({ id: 'second', label: 'Second', step: 2 }),
          node({ id: 'first', label: 'First', step: 1 }),
        ],
      }),
      labels,
    )

    expect(tables.elements.map((r) => r.label)).toEqual(['First', 'Second', 'Loose end'])
    expect(tables.elements.map((r) => r.step)).toEqual(['1', '2', ''])
  })

  it('numbers the steps as the reader sees them, closing the gaps', () => {
    const tables = buildReportTables(
      investigation({
        nodes: [node({ id: 'a', label: 'A', step: 1 }), node({ id: 'b', label: 'B', step: 9 })],
      }),
      labels,
    )

    expect(tables.elements.map((r) => r.step)).toEqual(['1', '2'])
  })

  it('names both ends of every connection on the element that has it', () => {
    const tables = buildReportTables(
      investigation({
        nodes: [node({ id: 'a', label: 'Alert' }), node({ id: 'b', label: 'Host' })],
        edges: [{ id: 'e1', source: 'a', target: 'b', type: 'maps_to', automatic: true }],
      }),
      labels,
    )

    expect(tables.elements[0].connections).toBe('→ Host')
    expect(tables.elements[1].connections).toBe('← Alert')
  })
})

describe('escapeHtml', () => {
  it('neutralises the characters that would end a tag', () => {
    expect(escapeHtml('a & "b" <c>')).toBe('a &amp; &quot;b&quot; &lt;c&gt;')
  })
})
