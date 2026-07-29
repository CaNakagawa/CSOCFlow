import { describe, expect, it } from 'vitest'
import { loadKnowledgeBase } from './loadKnowledgeBase'
import { createInMemorySource } from './source'
import { KnowledgeValidationError } from './errors'
import techniqueSchema from '../../../../public/data/schemas/technique.schema.json'
import evidenceSchema from '../../../../public/data/schemas/evidence.schema.json'
import hypothesisSchema from '../../../../public/data/schemas/hypothesis.schema.json'
import checkSchema from '../../../../public/data/schemas/check.schema.json'

const validTechnique = {
  id: 'T1110',
  name: 'Brute Force',
  type: 'mitre_technique',
  tactics: ['TA0006'],
  platforms: ['Linux'],
  brief: 'Tentativas repetidas de autenticação.',
  investigation_context: {
    what_it_means: '...',
    why_it_matters: '...',
    suspicious_when: [],
    legitimate_when: [],
    common_mistakes: [],
  },
  expected_evidence: ['authentication_event'],
  related_hypotheses: ['hypothesis.ssh_brute_force'],
  suggested_checks: [],
  references: [{ title: 'MITRE ATT&CK', url: 'https://attack.mitre.org/techniques/T1110/' }],
}

function baseFiles() {
  return {
    'schemas/technique.schema.json': techniqueSchema,
    'schemas/evidence.schema.json': evidenceSchema,
    'schemas/hypothesis.schema.json': hypothesisSchema,
    'schemas/check.schema.json': checkSchema,
    'mitre/tactics.json': [
      { id: 'TA0006', name: 'Credential Access', shortName: 'credential-access' },
    ],
    'relationships/relationships.json': [],
  }
}

describe('loadKnowledgeBase', () => {
  it('loads a well-formed knowledge base', async () => {
    const source = createInMemorySource({
      'manifest.json': {
        version: '1.0.0',
        tactics: 'mitre/tactics.json',
        techniques: ['mitre/techniques/T1110.json'],
        evidenceTypes: [],
        hypotheses: [],
        checks: [],
        investigationPatterns: [],
        relationships: ['relationships/relationships.json'],
      },
      ...baseFiles(),
      'mitre/techniques/T1110.json': validTechnique,
    })

    const kb = await loadKnowledgeBase(source)

    expect(kb.techniques).toHaveLength(1)
    expect(kb.techniques[0].id).toBe('T1110')
    expect(kb.tactics[0].id).toBe('TA0006')
  })

  it('throws KnowledgeValidationError when a technique file violates the schema', async () => {
    const { id: _id, ...invalidTechnique } = validTechnique
    const source = createInMemorySource({
      'manifest.json': {
        version: '1.0.0',
        tactics: 'mitre/tactics.json',
        techniques: ['mitre/techniques/broken.json'],
        evidenceTypes: [],
        hypotheses: [],
        checks: [],
        investigationPatterns: [],
        relationships: [],
      },
      ...baseFiles(),
      'mitre/techniques/broken.json': invalidTechnique,
    })

    await expect(loadKnowledgeBase(source)).rejects.toThrow(KnowledgeValidationError)
  })

  it('skips schema validation when disabled', async () => {
    const { id: _id, ...invalidTechnique } = validTechnique
    const source = createInMemorySource({
      'manifest.json': {
        version: '1.0.0',
        tactics: 'mitre/tactics.json',
        techniques: ['mitre/techniques/broken.json'],
        evidenceTypes: [],
        hypotheses: [],
        checks: [],
        investigationPatterns: [],
        relationships: [],
      },
      ...baseFiles(),
      'mitre/techniques/broken.json': invalidTechnique,
    })

    const kb = await loadKnowledgeBase(source, { validate: false })
    expect(kb.techniques).toHaveLength(1)
  })
})
