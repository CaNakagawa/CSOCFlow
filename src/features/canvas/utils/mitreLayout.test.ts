import { describe, expect, it } from 'vitest'
import {
  COLUMN_WIDTH,
  ROW_HEIGHT,
  TACTIC_ROW_Y,
  TECHNIQUE_START_Y,
  layoutLikeMitre,
} from './mitreLayout'
import type { InvestigationNode } from '../../../shared/types/investigation'
import type { MitreTactic, MitreTechnique } from '../../../shared/types/knowledge'

const tactics: MitreTactic[] = [
  { id: 'TA0001', name: 'Initial Access', shortName: 'initial-access' },
  { id: 'TA0003', name: 'Persistence', shortName: 'persistence' },
  { id: 'TA0004', name: 'Privilege Escalation', shortName: 'privilege-escalation' },
]

function technique(id: string, tacticIds: string[]): MitreTechnique {
  return {
    id,
    name: id,
    type: 'mitre_technique',
    tactics: tacticIds,
    platforms: [],
    brief: { en: '' },
    expected_evidence: [],
    related_hypotheses: [],
    suggested_checks: [],
    detection_analytics: [],
    references: [],
  }
}

function node(
  id: string,
  type: InvestigationNode['type'],
  definitionId: string,
): InvestigationNode {
  return {
    id,
    definitionId,
    type,
    label: id,
    state: 'unknown',
    position: { x: 999, y: 999 },
    fields: {},
    notes: '',
    createdAt: '2026-07-31T00:00:00.000Z',
    updatedAt: '2026-07-31T00:00:00.000Z',
  }
}

const techniques = [
  technique('T1078', ['TA0001', 'TA0003']),
  technique('T1098', ['TA0003']),
  technique('T1055', ['TA0004']),
]

describe('layoutLikeMitre', () => {
  it('lines the tactics up horizontally in matrix order on a single row', () => {
    const nodes = [
      node('tac-3', 'mitre_tactic', 'TA0004'),
      node('tac-1', 'mitre_tactic', 'TA0001'),
      node('tac-2', 'mitre_tactic', 'TA0003'),
    ]

    const positions = layoutLikeMitre(nodes, tactics, techniques)

    expect(positions.get('tac-1')).toEqual({ x: 0, y: TACTIC_ROW_Y })
    expect(positions.get('tac-2')).toEqual({ x: COLUMN_WIDTH, y: TACTIC_ROW_Y })
    expect(positions.get('tac-3')).toEqual({ x: COLUMN_WIDTH * 2, y: TACTIC_ROW_Y })
  })

  it('puts each technique in the column of the tactic it belongs to, below the row', () => {
    const nodes = [
      node('tac-1', 'mitre_tactic', 'TA0001'),
      node('tac-2', 'mitre_tactic', 'TA0003'),
      node('tec-1', 'mitre_technique', 'T1098'),
    ]

    const positions = layoutLikeMitre(nodes, tactics, techniques)

    expect(positions.get('tec-1')).toEqual({ x: COLUMN_WIDTH, y: TECHNIQUE_START_Y })
  })

  it('stacks several techniques of the same tactic without overlapping', () => {
    const nodes = [
      node('tac-2', 'mitre_tactic', 'TA0003'),
      node('tec-1', 'mitre_technique', 'T1098'),
      node('tec-2', 'mitre_technique', 'T1078'),
    ]

    const positions = layoutLikeMitre(nodes, tactics, techniques)

    // T1078 spans TA0001 and TA0003; it belongs to the earliest, so a different column
    expect(positions.get('tec-1')).toEqual({ x: COLUMN_WIDTH, y: TECHNIQUE_START_Y })
    expect(positions.get('tec-2')).toEqual({ x: 0, y: TECHNIQUE_START_Y })
  })

  it('stacks techniques sharing a column one row apart', () => {
    const extra = [...techniques, technique('T1136', ['TA0003'])]
    const nodes = [
      node('tec-1', 'mitre_technique', 'T1098'),
      node('tec-2', 'mitre_technique', 'T1136'),
    ]

    const positions = layoutLikeMitre(nodes, tactics, extra)

    expect(positions.get('tec-1')).toEqual({ x: COLUMN_WIDTH, y: TECHNIQUE_START_Y })
    expect(positions.get('tec-2')).toEqual({ x: COLUMN_WIDTH, y: TECHNIQUE_START_Y + ROW_HEIGHT })
  })

  it('parks a technique with no known tactic past the matrix instead of on top of it', () => {
    const nodes = [node('tec-x', 'mitre_technique', 'T9999')]

    const positions = layoutLikeMitre(nodes, tactics, techniques)

    expect(positions.get('tec-x')).toEqual({
      x: tactics.length * COLUMN_WIDTH,
      y: TECHNIQUE_START_Y,
    })
  })

  it('moves evidence below the matrix so nothing lands on top of it', () => {
    const nodes = [
      node('tac-1', 'mitre_tactic', 'TA0001'),
      node('tec-1', 'mitre_technique', 'T1078'),
      node('host', 'host', 'evidence.identity.host'),
    ]

    const positions = layoutLikeMitre(nodes, tactics, techniques)

    expect(positions.get('host')!.y).toBeGreaterThan(positions.get('tec-1')!.y)
  })

  it('positions every node it is given', () => {
    const nodes = [
      node('tac-1', 'mitre_tactic', 'TA0001'),
      node('tec-1', 'mitre_technique', 'T1078'),
      node('host', 'host', 'evidence.identity.host'),
      node('note', 'analyst_note', 'generic.analyst_note'),
    ]

    const positions = layoutLikeMitre(nodes, tactics, techniques)

    expect(positions.size).toBe(nodes.length)
  })
})
