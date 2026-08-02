import { describe, expect, it } from 'vitest'
import { investigationToCsv } from './investigationCsv'
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
    const lines = csv.trim().split('\n')

    expect(lines[0]).toBe('kind,id,type,label,state,source,target,notes')
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

  it('escapes quotes so a label cannot break the table', () => {
    const csv = investigationToCsv(doc({ nodes: [node('1', 'He said "run"')] }))
    expect(csv).toContain('"He said ""run"""')
  })
})
