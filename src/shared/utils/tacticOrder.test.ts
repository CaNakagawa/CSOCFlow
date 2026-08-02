import { describe, expect, it } from 'vitest'
import { sortTacticIds } from './tacticOrder'
import type { MitreTactic } from '../types/knowledge'

/** A slice of the real matrix, in matrix order. Note the ids are not sequential. */
const tactics: MitreTactic[] = [
  { id: 'TA0043', name: { en: 'Reconnaissance' }, shortName: 'reconnaissance' },
  { id: 'TA0001', name: { en: 'Initial Access' }, shortName: 'initial-access' },
  { id: 'TA0003', name: { en: 'Persistence' }, shortName: 'persistence' },
  { id: 'TA0004', name: { en: 'Privilege Escalation' }, shortName: 'privilege-escalation' },
  { id: 'TA0005', name: { en: 'Stealth' }, shortName: 'stealth' },
  { id: 'TA0040', name: { en: 'Impact' }, shortName: 'impact' },
]

describe('sortTacticIds', () => {
  it('orders by matrix position, not by id', () => {
    // Sorting by id would put TA0001 before TA0043, which is backwards.
    expect(sortTacticIds(['TA0001', 'TA0043'], tactics)).toEqual(['TA0043', 'TA0001'])
  })

  it('fixes the real T1055 case where MITRE lists Stealth before Privilege Escalation', () => {
    expect(sortTacticIds(['TA0005', 'TA0004'], tactics)).toEqual(['TA0004', 'TA0005'])
  })

  it('keeps the correct sequence when tactics in between are missing', () => {
    expect(sortTacticIds(['TA0040', 'TA0003', 'TA0043'], tactics)).toEqual([
      'TA0043',
      'TA0003',
      'TA0040',
    ])
  })

  it('leaves an already ordered list untouched', () => {
    expect(sortTacticIds(['TA0043', 'TA0004', 'TA0040'], tactics)).toEqual([
      'TA0043',
      'TA0004',
      'TA0040',
    ])
  })

  it('keeps unknown ids at the end instead of dropping them', () => {
    expect(sortTacticIds(['TA9999', 'TA0004', 'TA0043'], tactics)).toEqual([
      'TA0043',
      'TA0004',
      'TA9999',
    ])
  })

  it('does not mutate the input', () => {
    const input = ['TA0005', 'TA0004']
    sortTacticIds(input, tactics)
    expect(input).toEqual(['TA0005', 'TA0004'])
  })

  it('handles empty input', () => {
    expect(sortTacticIds([], tactics)).toEqual([])
  })
})
