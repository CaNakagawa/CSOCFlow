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
  it('carries back everything the analyst set on an element', () => {
    const document = validDocument()
    document.canvas.nodes = [
      {
        id: 'n1',
        definitionId: 'T1110',
        type: 'mitre_technique',
        label: 'T1110 - Brute Force',
        state: 'suspicious',
        position: { x: 10, y: 20 },
        fields: {},
        notes: 'three failures',
        analyticStatuses: { AN0001: 'confirmed' },
        analyticsExpanded: true,
        size: { width: 300, height: 200 },
        parentId: 'g1',
        layer: 3,
        color: '#ef4444',
        icon: 'bug',
        step: 2,
        eventAt: '10:42',
        createdAt: '2026-07-29T00:00:00.000Z',
        updatedAt: '2026-07-29T00:00:00.000Z',
      },
    ] as never

    const parsed = investigationSchema.parse(document)

    // Zod drops what it was not told about, so an omission here loses work.
    expect(parsed.canvas.nodes[0]).toMatchObject({
      analyticStatuses: { AN0001: 'confirmed' },
      analyticsExpanded: true,
      size: { width: 300, height: 200 },
      parentId: 'g1',
      layer: 3,
      color: '#ef4444',
      icon: 'bug',
      step: 2,
      eventAt: '10:42',
    })
  })

  it('carries a drawing and a pasted image back', () => {
    const document = validDocument()
    document.canvas.nodes = [
      {
        id: 'd1',
        definitionId: '',
        type: 'drawing',
        label: '',
        state: 'unknown',
        position: { x: 0, y: 0 },
        fields: {},
        stroke: { points: [{ x: 1, y: 2 }], color: '#f59e0b', width: 3 },
        imageSrc: 'data:image/png;base64,AAAA',
        createdAt: '2026-07-29T00:00:00.000Z',
        updatedAt: '2026-07-29T00:00:00.000Z',
      },
    ] as never

    const parsed = investigationSchema.parse(document)

    expect(parsed.canvas.nodes[0].stroke).toEqual({
      points: [{ x: 1, y: 2 }],
      color: '#f59e0b',
      width: 3,
    })
    expect(parsed.canvas.nodes[0].imageSrc).toBe('data:image/png;base64,AAAA')
  })

  it('carries a connection the analyst restyled', () => {
    const document = validDocument()
    document.canvas.edges = [
      {
        id: 'e1',
        source: 'a',
        target: 'b',
        type: 'maps_to',
        automatic: false,
        color: '#22c55e',
        lineStyle: 'dashed',
      },
    ] as never

    const parsed = investigationSchema.parse(document)

    expect(parsed.canvas.edges[0]).toMatchObject({ color: '#22c55e', lineStyle: 'dashed' })
  })

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
