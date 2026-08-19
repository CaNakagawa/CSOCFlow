import { describe, expect, it } from 'vitest'
import { fileNameForUseCase, serializeUseCase } from './exportUseCase'
import { parseUseCase } from './parseUseCase'
import type { UseCaseDefinition } from '../../../shared/types/knowledge'

const USE_CASE: UseCaseDefinition = {
  id: 'use-case.ssh_brute_force',
  name: { en: 'SSH brute force', pt: 'Força bruta SSH' },
  description: { en: 'Many failed logins followed by one that worked.' },
  tactics: ['TA0006'],
  techniques: ['T1110', 'T1110.001'],
  investigationSteps: [
    {
      order: 1,
      techniqueId: 'T1110',
      instruction: { en: 'Count the failures and find the success.' },
      detectionStrategies: [],
    },
  ],
  dataSources: { en: ['Authentication logs'] },
  relatedHypotheses: [],
  sourceReference: null,
}

describe('use case export', () => {
  it('writes a file the importer accepts back', () => {
    const json = serializeUseCase(USE_CASE)
    const round = parseUseCase(json, { builtInIds: [] })
    expect(round).toEqual(USE_CASE)
  })

  it('refuses its own file while the id is still the built-in one', () => {
    const json = serializeUseCase(USE_CASE)
    expect(() => parseUseCase(json, { builtInIds: [USE_CASE.id] })).toThrow('idTaken')
  })

  it('names the file after the case', () => {
    expect(fileNameForUseCase(USE_CASE)).toBe('ssh-brute-force.json')
  })
})
