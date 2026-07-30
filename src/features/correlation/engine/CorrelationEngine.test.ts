import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { createCorrelationEngine } from './CorrelationEngine'
import { loadKnowledgeBase } from '../../knowledge-base/loader/loadKnowledgeBase'
import type { KnowledgeSource } from '../../knowledge-base/loader/source'
import type { KnowledgeBase } from '../../../shared/types/knowledge'
import type { InvestigationNode } from '../../../shared/types/investigation'

const dataRoot = path.resolve(import.meta.dirname, '../../../../public/data')

function createFsSource(root: string): KnowledgeSource {
  return {
    async readJson(filePath: string) {
      const contents = await readFile(path.join(root, filePath), 'utf-8')
      return JSON.parse(contents)
    },
  }
}

function makeNode(
  partial: Partial<InvestigationNode> & Pick<InvestigationNode, 'id' | 'type' | 'fields'>,
): InvestigationNode {
  return {
    label: partial.id,
    state: 'observed',
    position: { x: 0, y: 0 },
    notes: '',
    createdAt: '2026-07-29T00:00:00.000Z',
    updatedAt: '2026-07-29T00:00:00.000Z',
    definitionId: partial.type,
    ...partial,
  }
}

describe('CorrelationEngine (real SSH brute force knowledge base)', () => {
  let knowledgeBase: KnowledgeBase

  beforeAll(async () => {
    const source = createFsSource(dataRoot)
    knowledgeBase = await loadKnowledgeBase(source, { validate: true })
  })

  it('suggests SSH Brute Force with high confidence when all supporting evidence is present', () => {
    const engine = createCorrelationEngine()
    const nodes: InvestigationNode[] = [
      makeNode({
        id: 'evt-failed',
        type: 'authentication_event',
        fields: {
          protocol: 'ssh',
          result: 'failed',
          failed_attempts: 83,
          source_ip: '198.51.100.23',
          target_users: ['root', 'admin'],
          timestamp: '2026-07-29T10:00:00.000Z',
        },
      }),
      makeNode({
        id: 'evt-success',
        type: 'authentication_event',
        fields: {
          protocol: 'ssh',
          result: 'success',
          source_ip: '198.51.100.23',
          target_users: ['root'],
          timestamp: '2026-07-29T10:30:00.000Z',
        },
      }),
      makeNode({
        id: 'ip-1',
        type: 'ip_address',
        fields: { value: '198.51.100.23', reputation: 'malicious' },
      }),
    ]

    const result = engine.evaluate({ nodes, edges: [], knowledgeBase, checkAnswers: [], locale: 'en' })

    const sshBruteForce = result.hypotheses.find(
      (h) => h.hypothesisId === 'hypothesis.ssh_brute_force',
    )
    expect(sshBruteForce).toBeDefined()
    expect(sshBruteForce!.normalizedScore).toBe(100)
    expect(sshBruteForce!.confidenceLevel).toBe('high')
    expect(sshBruteForce!.matchedConditions).toHaveLength(5)
    expect(sshBruteForce!.contradictedConditions).toHaveLength(0)
    expect(sshBruteForce!.explanation).toContain('protocol used')
  })

  it('weakens the hypothesis when the source IP is an approved scanner', () => {
    const engine = createCorrelationEngine()
    const nodes: InvestigationNode[] = [
      makeNode({
        id: 'evt-failed',
        type: 'authentication_event',
        fields: {
          protocol: 'ssh',
          result: 'failed',
          failed_attempts: 83,
          source_ip: '198.51.100.23',
          timestamp: '2026-07-29T10:00:00.000Z',
        },
      }),
      makeNode({
        id: 'evt-success',
        type: 'authentication_event',
        fields: {
          protocol: 'ssh',
          result: 'success',
          source_ip: '198.51.100.23',
          timestamp: '2026-07-29T10:30:00.000Z',
        },
      }),
      makeNode({
        id: 'ip-1',
        type: 'ip_address',
        fields: { value: '198.51.100.23', reputation: 'malicious', is_approved_scanner: true },
      }),
    ]

    const result = engine.evaluate({ nodes, edges: [], knowledgeBase, checkAnswers: [], locale: 'en' })
    const sshBruteForce = result.hypotheses.find(
      (h) => h.hypothesisId === 'hypothesis.ssh_brute_force',
    )

    expect(sshBruteForce).toBeDefined()
    expect(sshBruteForce!.score).toBe(60)
    expect(sshBruteForce!.confidenceLevel).toBe('probable')
    expect(sshBruteForce!.contradictedConditions).toHaveLength(1)
  })

  it('does not suggest the hypothesis when no supporting evidence exists', () => {
    const engine = createCorrelationEngine()
    const result = engine.evaluate({ nodes: [], edges: [], knowledgeBase, checkAnswers: [], locale: 'en' })
    expect(
      result.hypotheses.find((h) => h.hypothesisId === 'hypothesis.ssh_brute_force'),
    ).toBeUndefined()
  })

  it('applies recommended-check answer effects to the score', () => {
    const engine = createCorrelationEngine()
    const nodes: InvestigationNode[] = [
      makeNode({
        id: 'evt-failed',
        type: 'authentication_event',
        fields: {
          protocol: 'ssh',
          result: 'failed',
          failed_attempts: 25,
          source_ip: '198.51.100.23',
        },
      }),
    ]

    const withoutAnswer = engine.evaluate({
      nodes,
      edges: [],
      knowledgeBase,
      checkAnswers: [],
      locale: 'en',
    })
    const withAnswer = engine.evaluate({
      nodes,
      edges: [],
      knowledgeBase,
      checkAnswers: [
        {
          checkId: 'check.authentication_success',
          value: 'yes',
          answeredAt: '2026-07-29T11:00:00.000Z',
        },
      ],
      locale: 'en',
    })

    const before = withoutAnswer.hypotheses.find(
      (h) => h.hypothesisId === 'hypothesis.ssh_brute_force',
    )
    const after = withAnswer.hypotheses.find((h) => h.hypothesisId === 'hypothesis.ssh_brute_force')

    expect(before!.score).toBe(50)
    expect(after!.score).toBe(75)
  })

  it('infers an authenticated_from edge between an authentication event and its source IP', () => {
    const engine = createCorrelationEngine()
    const nodes: InvestigationNode[] = [
      makeNode({
        id: 'evt-failed',
        type: 'authentication_event',
        fields: { protocol: 'ssh', result: 'failed', source_ip: '198.51.100.23' },
      }),
      makeNode({ id: 'ip-1', type: 'ip_address', fields: { value: '198.51.100.23' } }),
    ]

    const result = engine.evaluate({ nodes, edges: [], knowledgeBase, checkAnswers: [], locale: 'en' })
    const edge = result.inferredEdges.find((e) => e.source === 'evt-failed' && e.target === 'ip-1')

    expect(edge).toBeDefined()
    expect(edge!.type).toBe('authenticated_from')
    expect(edge!.automatic).toBe(true)
  })
})
