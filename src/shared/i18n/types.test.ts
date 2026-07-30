import { describe, expect, it } from 'vitest'
import { localize, localizeList } from './types'

describe('localize', () => {
  it('returns the requested locale when it is present', () => {
    expect(localize({ en: 'Host', pt: 'Máquina', de: 'Rechner' }, 'pt')).toBe('Máquina')
  })

  it('falls back to English for content imported without translations', () => {
    expect(localize({ en: 'Adversaries may brute force credentials.' }, 'de')).toBe(
      'Adversaries may brute force credentials.',
    )
  })

  it('falls back to English when only the other alternate locale exists', () => {
    expect(localize({ en: 'Host', pt: 'Máquina' }, 'de')).toBe('Host')
  })
})

describe('localizeList', () => {
  it('returns the requested locale when it is present', () => {
    expect(localizeList({ en: ['a'], pt: ['b'], de: ['c'] }, 'de')).toEqual(['c'])
  })

  it('falls back to English when the locale is missing', () => {
    expect(localizeList({ en: ['a'] }, 'pt')).toEqual(['a'])
  })

  it('keeps an intentionally empty list instead of falling back', () => {
    expect(localizeList({ en: ['a'], pt: [] }, 'pt')).toEqual([])
  })
})
