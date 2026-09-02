import { describe, expect, it } from 'vitest'
import { toNavigatorLayer } from './attackNavigatorLayer'
import type { Investigation, InvestigationNode } from '../../../shared/types/investigation'
import type { KnowledgeBase } from '../../../shared/types/knowledge'

const knowledgeBase = {
  version: '1.0.0',
  attackVersion: '19.1',
  tactics: [
    { id: 'TA0006', name: { en: 'Credential Access' }, shortName: 'credential-access' },
    { id: 'TA0001', name: { en: 'Initial Access' }, shortName: 'initial-access' },
  ],
  techniques: [
    { id: 'T1110', tactics: ['TA0006'] },
    { id: 'T1110.001', tactics: ['TA0006'] },
    // Valid Accounts really does sit in four columns of the matrix.
    { id: 'T1078', tactics: ['TA0001', 'TA0006'] },
    { id: 'T9999', tactics: [] },
  ],
  evidenceTypes: [],
  hypotheses: [],
  checks: [],
  useCases: [],
  relationshipRules: [],
} as unknown as KnowledgeBase

function node(partial: Partial<InvestigationNode>): InvestigationNode {
  return {
    id: partial.definitionId ?? 'n1',
    definitionId: 'T1110',
    type: 'mitre_technique',
    label: 'T1110 - Brute Force',
    state: 'unknown',
    position: { x: 0, y: 0 },
    fields: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  } as InvestigationNode
}

function investigation(nodes: InvestigationNode[]): Investigation {
  return {
    schemaVersion: '1.0.0',
    applicationVersion: '0.1.0',
    investigation: {
      id: 'inv-1',
      title: 'SSH brute force',
      caseId: 'CASE-7',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      analyst: 'me',
      description: 'A burst of failures then one success.',
      status: 'open',
      conclusion: null,
    },
    canvas: { viewport: { x: 0, y: 0, zoom: 1 }, nodes, edges: [] },
    hypotheses: [],
    timeline: [],
    report: { analystNotes: '', recommendations: [] },
  } as unknown as Investigation
}

describe('toNavigatorLayer', () => {
  it('declares the versions the Navigator checks', () => {
    const layer = toNavigatorLayer(investigation([node({})]), knowledgeBase)

    expect(layer.versions).toEqual({ attack: '19', navigator: '5.1.0', layer: '4.5' })
    expect(layer.domain).toBe('enterprise-attack')
  })

  it('names the layer after the investigation, and says where it came from', () => {
    const layer = toNavigatorLayer(investigation([node({})]), knowledgeBase)

    expect(layer.name).toBe('SSH brute force')
    expect(layer.description).toContain('CASE-7')
  })

  it('places a technique in its tactic column by shortname', () => {
    const layer = toNavigatorLayer(investigation([node({})]), knowledgeBase)

    expect(layer.techniques).toEqual([
      expect.objectContaining({ techniqueID: 'T1110', tactic: 'credential-access' }),
    ])
  })

  it('writes a technique once per tactic it belongs to', () => {
    const layer = toNavigatorLayer(
      investigation([node({ definitionId: 'T1078', state: 'suspicious' })]),
      knowledgeBase,
    )

    // Sorted, not matrix order: two exports of one board have to match.
    expect(layer.techniques.map((t) => t.tactic)).toEqual(['credential-access', 'initial-access'])
    expect(new Set(layer.techniques.map((t) => t.score))).toEqual(new Set([70]))
  })

  it('scores by the same reading the canvas colours by', () => {
    const layer = toNavigatorLayer(
      investigation([
        node({ id: 'a', definitionId: 'T1110', state: 'confirmed_malicious' }),
        node({ id: 'b', definitionId: 'T1110.001', state: 'false_positive' }),
      ]),
      knowledgeBase,
    )

    expect(layer.techniques.find((t) => t.techniqueID === 'T1110')!.score).toBe(100)
    expect(layer.techniques.find((t) => t.techniqueID === 'T1110.001')!.score).toBe(0)
  })

  it('lets a confirmed analytic raise the score, as it does on the canvas', () => {
    const layer = toNavigatorLayer(
      investigation([node({ state: 'observed', analyticStatuses: { AN0001: 'confirmed' } })]),
      knowledgeBase,
    )

    expect(layer.techniques[0].score).toBe(100)
  })

  it('keeps the loudest card when the same technique is on the canvas twice', () => {
    const layer = toNavigatorLayer(
      investigation([
        node({ id: 'a', state: 'observed', notes: 'quiet' }),
        node({ id: 'b', state: 'confirmed_malicious', notes: 'this is the one' }),
      ]),
      knowledgeBase,
    )

    expect(layer.techniques).toHaveLength(1)
    expect(layer.techniques[0].score).toBe(100)
    expect(layer.techniques[0].comment).toBe('this is the one')
  })

  it('carries a hand-picked colour and the analyst notes across', () => {
    const layer = toNavigatorLayer(
      investigation([node({ color: '#a855f7', notes: '  three failed logins  ' })]),
      knowledgeBase,
    )

    expect(layer.techniques[0].color).toBe('#a855f7')
    expect(layer.techniques[0].comment).toBe('three failed logins')
  })

  it('leaves out an element with nothing to say about it', () => {
    const layer = toNavigatorLayer(investigation([node({})]), knowledgeBase)

    expect(layer.techniques[0]).not.toHaveProperty('comment')
    expect(layer.techniques[0]).not.toHaveProperty('color')
  })

  it('takes only MITRE techniques, leaving the rest of the canvas behind', () => {
    const layer = toNavigatorLayer(
      investigation([
        node({}),
        node({ id: 'ip', definitionId: 'evidence.ip', type: 'ip_address' }),
        node({ id: 'txt', definitionId: '', type: 'text' }),
      ]),
      knowledgeBase,
    )

    expect(layer.techniques.map((t) => t.techniqueID)).toEqual(['T1110'])
  })

  it('still writes a technique the base has no tactic for, without a column', () => {
    const layer = toNavigatorLayer(investigation([node({ definitionId: 'T9999' })]), knowledgeBase)

    expect(layer.techniques[0]).toEqual(
      expect.objectContaining({ techniqueID: 'T9999', enabled: true }),
    )
    expect(layer.techniques[0]).not.toHaveProperty('tactic')
  })

  it('sorts the techniques so two exports of the same board match', () => {
    const layer = toNavigatorLayer(
      investigation([
        node({ id: 'c', definitionId: 'T1110.001' }),
        node({ id: 'a', definitionId: 'T1078' }),
        node({ id: 'b', definitionId: 'T1110' }),
      ]),
      knowledgeBase,
    )

    expect(layer.techniques.map((t) => t.techniqueID)).toEqual([
      'T1078',
      'T1078',
      'T1110',
      'T1110.001',
    ])
  })
})
