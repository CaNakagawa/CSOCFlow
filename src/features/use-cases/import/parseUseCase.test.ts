import { describe, expect, it } from 'vitest'
import { parseUseCase, UseCaseImportError } from './parseUseCase'

const VALID = {
  id: 'use-case.my_own_case',
  name: { en: 'Impossible travel' },
  description: { en: 'Two sign-ins too far apart to be the same person.' },
  tactics: ['TA0001'],
  techniques: ['T1078'],
  investigationSteps: [
    {
      order: 1,
      techniqueId: 'T1078',
      instruction: { en: 'Compare the two source addresses.' },
      detectionStrategies: [],
    },
  ],
  dataSources: { en: ['Sign-in logs'] },
  relatedHypotheses: [],
  sourceReference: null,
}

const options = { builtInIds: ['use-case.suspicious_authentication'] }

describe('parseUseCase', () => {
  it('accepts a use case written by the analyst', () => {
    const useCase = parseUseCase(JSON.stringify(VALID), options)
    expect(useCase.id).toBe('use-case.my_own_case')
    expect(useCase.techniques).toEqual(['T1078'])
  })

  it('accepts English alone, without the other two locales', () => {
    const useCase = parseUseCase(JSON.stringify(VALID), options)
    expect(useCase.name.pt).toBeUndefined()
  })

  it('fills in the optional lists so the panel can read them', () => {
    const bare = {
      id: 'use-case.bare',
      name: { en: 'Bare' },
      description: { en: 'Nothing optional given.' },
      tactics: ['TA0002'],
      techniques: ['T1059'],
    }
    const useCase = parseUseCase(JSON.stringify(bare), options)
    expect(useCase.investigationSteps).toEqual([])
    expect(useCase.dataSources).toEqual({ en: [] })
    expect(useCase.relatedHypotheses).toEqual([])
    expect(useCase.sourceReference).toBeNull()
  })

  it('turns away something that is not JSON', () => {
    expect(() => parseUseCase('not json at all', options)).toThrow(UseCaseImportError)
  })

  it('turns away an id that does not name a use case', () => {
    const wrong = { ...VALID, id: 'my-case' }
    expect(() => parseUseCase(JSON.stringify(wrong), options)).toThrow(/use-case\./)
  })

  it('turns away a technique id that is not a technique id', () => {
    const wrong = { ...VALID, techniques: ['brute force'] }
    expect(() => parseUseCase(JSON.stringify(wrong), options)).toThrow(/T1110/)
  })

  it('turns away a link that is not a web page', () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,<b>x</b>', 'file:///etc/passwd']) {
      const viaSource = { ...VALID, sourceReference: { title: 'x', url } }
      expect(() => parseUseCase(JSON.stringify(viaSource), options)).toThrow(/http\(s\)/)
      const viaStrategy = {
        ...VALID,
        investigationSteps: [
          { ...VALID.investigationSteps[0], detectionStrategies: [{ id: 's', name: { en: 's' }, url }] },
        ],
      }
      expect(() => parseUseCase(JSON.stringify(viaStrategy), options)).toThrow(/http\(s\)/)
    }
  })

  it('keeps an https link', () => {
    const ok = { ...VALID, sourceReference: { title: 'ATT&CK', url: 'https://attack.mitre.org/techniques/T1078/' } }
    expect(parseUseCase(JSON.stringify(ok), options).sourceReference?.url).toBe(
      'https://attack.mitre.org/techniques/T1078/',
    )
  })

  it('recognises an investigation file and says so', () => {
    const investigation = {
      schemaVersion: '1.0.0',
      applicationVersion: '0.1.0',
      investigation: { id: 'inv-1', title: 'Demo: SSH Brute Force' },
      canvas: { nodes: [], edges: [] },
    }
    expect(() => parseUseCase(JSON.stringify(investigation), options)).toThrow('isInvestigation')
  })

  it('refuses to shadow a use case that ships with the app', () => {
    const clash = { ...VALID, id: 'use-case.suspicious_authentication' }
    expect(() => parseUseCase(JSON.stringify(clash), options)).toThrow('idTaken')
  })

  it('needs at least one tactic and one technique', () => {
    const empty = { ...VALID, techniques: [] }
    expect(() => parseUseCase(JSON.stringify(empty), options)).toThrow(UseCaseImportError)
  })
})
