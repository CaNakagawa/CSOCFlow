import { describe, expect, it } from 'vitest'
import { investigationSchema } from './investigationZodSchema'

/** The smallest document the schema accepts, with a Navigator-scored technique and its scale. */
function document() {
  return {
    schemaVersion: '1.0.0',
    applicationVersion: '0.1.0',
    investigation: {
      id: 'i',
      title: 't',
      caseId: '',
      createdAt: '',
      updatedAt: '',
      analyst: '',
      description: '',
      status: 'open',
      conclusion: null,
    },
    canvas: {
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: [
        {
          id: 'n1',
          definitionId: 'T1105',
          type: 'mitre_technique',
          label: 'T1105',
          state: 'unknown',
          position: { x: 0, y: 0 },
          fields: {},
          color: '#8ec843',
          navigatorScore: 25,
          createdAt: '',
          updatedAt: '',
        },
      ],
      edges: [],
      heatScale: { colors: ['#ff6666', '#ffe766', '#8ec843'], min: 1, max: 26 },
    },
    hypotheses: [],
    timeline: [],
    report: { analystNotes: '', recommendations: [] },
  }
}

describe('investigationSchema with a Navigator layer', () => {
  it('keeps a technique score and the colour scale it was painted with', () => {
    const parsed = investigationSchema.parse(document())

    expect(parsed.canvas.nodes[0].navigatorScore).toBe(25)
    expect(parsed.canvas.heatScale).toEqual({
      colors: ['#ff6666', '#ffe766', '#8ec843'],
      min: 1,
      max: 26,
    })
  })

  it('still reads an investigation saved before layers carried scores', () => {
    const old = document()
    delete (old.canvas as { heatScale?: unknown }).heatScale
    delete (old.canvas.nodes[0] as { navigatorScore?: unknown }).navigatorScore

    const parsed = investigationSchema.parse(old)
    expect(parsed.canvas.heatScale).toBeUndefined()
    expect(parsed.canvas.nodes[0].navigatorScore).toBeUndefined()
  })
})
