import { describe, expect, it } from 'vitest'
import { CSV_BOM, investigationToCsv } from './investigationCsv'
import type { Investigation } from '../../../shared/types/investigation'

function doc(overrides: Partial<Investigation['canvas']> = {}): Investigation {
  return {
    schemaVersion: '1.0.0',
    applicationVersion: '0.1.0',
    investigation: {
      id: 'inv-1',
      title: 'Phishing wave',
      caseId: '',
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-01T00:00:00.000Z',
      analyst: '',
      description: '',
      status: 'open',
      conclusion: null,
    },
    canvas: { viewport: { x: 0, y: 0, zoom: 1 }, nodes: [], edges: [], ...overrides },
    hypotheses: [],
    timeline: [],
    report: { analystNotes: '', recommendations: [] },
  }
}

const node = (id: string, label: string) => ({
  id,
  definitionId: `T${id}`,
  type: 'mitre_technique' as const,
  label,
  state: 'confirmed_malicious' as const,
  position: { x: 0, y: 0 },
  fields: {},
  notes: '',
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
})

describe('investigationToCsv', () => {
  it('writes a header and one row per element', () => {
    const csv = investigationToCsv(
      doc({ nodes: [node('1', 'Phishing'), node('2', 'Brute Force')] }),
    )
    const lines = csv.replace(CSV_BOM, '').trim().split('\n')

    expect(lines[0]).toBe('kind,step,time,type,label,state,from,to,connections,notes')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toContain('"element"')
    expect(lines[1]).toContain('"Phishing"')
  })

  it('names the ends of a connection rather than repeating their ids', () => {
    const csv = investigationToCsv(
      doc({
        nodes: [node('1', 'Phishing'), node('2', 'Brute Force')],
        edges: [
          {
            id: 'e1',
            source: '1',
            target: '2',
            type: 'occurred_before',
            automatic: false,
          },
        ],
      }),
    )

    const connection = csv.trim().split('\n').at(-1)!
    expect(connection).toContain('"connection"')
    expect(connection).toContain('"Phishing"')
    expect(connection).toContain('"Brute Force"')
  })

  it('starts with the mark Excel needs to read it as UTF-8', () => {
    const csv = investigationToCsv(doc({ nodes: [node('1', 'Invasão')] }))

    // Without it Excel falls back to the system codepage and mangles accents.
    expect(csv.startsWith(CSV_BOM)).toBe(true)
    expect(csv).toContain('Invasão')
  })

  it('carries the place in the story and the time of the event', () => {
    const csv = investigationToCsv(
      doc({
        nodes: [
          { ...node('1', 'Phishing'), step: 2, eventAt: '10:42' },
          { ...node('2', 'Brute Force'), step: 1 },
        ],
      }),
    )
    const lines = csv.replace(CSV_BOM, '').trim().split('\n')

    // The story's order, not the order they were dropped on the canvas.
    expect(lines[1]).toContain('"Brute Force"')
    expect(lines[1]).toContain('"1"')
    expect(lines[2]).toContain('"Phishing"')
    expect(lines[2]).toContain('"10:42"')
  })

  it('lists what each element is connected to, in its own row', () => {
    const csv = investigationToCsv(
      doc({
        nodes: [node('1', 'Phishing'), node('2', 'Brute Force')],
        edges: [{ id: 'e1', source: '1', target: '2', type: 'occurred_before', automatic: false }],
      }),
    )
    const lines = csv.replace(CSV_BOM, '').trim().split('\n')

    expect(lines[1]).toContain('→ Brute Force')
    expect(lines[2]).toContain('← Phishing')
  })

  it('escapes quotes so a label cannot break the table', () => {
    const csv = investigationToCsv(doc({ nodes: [node('1', 'He said "run"')] }))
    expect(csv).toContain('"He said ""run"""')
  })
})
