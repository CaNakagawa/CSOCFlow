import { describe, expect, it } from 'vitest'
import { investigationSchema } from './investigationZodSchema'

function validDocument() {
  return {
    schemaVersion: '1.0.0',
    applicationVersion: '0.1.0',
    investigation: {
      id: 'inv-1',
      title: 'Caso teste',
      caseId: 'CASE-1',
      createdAt: '2026-07-29T00:00:00.000Z',
      updatedAt: '2026-07-29T00:00:00.000Z',
      analyst: 'Analista',
      description: '',
      status: 'open',
      conclusion: null,
    },
    canvas: {
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: [],
      edges: [],
    },
    hypotheses: [],
    timeline: [],
    report: { analystNotes: '', recommendations: [] },
  }
}

describe('investigationSchema', () => {
  it('accepts a well-formed investigation document', () => {
    const result = investigationSchema.safeParse(validDocument())
    expect(result.success).toBe(true)
  })

  it('rejects a document with an invalid conclusion value', () => {
    const doc = validDocument()
    doc.investigation.conclusion = 'maybe' as never
    const result = investigationSchema.safeParse(doc)
    expect(result.success).toBe(false)
  })

  it('rejects a document missing required canvas fields', () => {
    const doc = validDocument() as Record<string, unknown>
    delete (doc.canvas as Record<string, unknown>).viewport
    const result = investigationSchema.safeParse(doc)
    expect(result.success).toBe(false)
  })
})
