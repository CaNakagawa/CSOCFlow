import { describe, expect, it } from 'vitest'
import { nodeSignal, signalTone } from './nodeSignal'

describe('nodeSignal', () => {
  it('reads a confirmed verdict as the top of the scale', () => {
    expect(nodeSignal('confirmed_malicious')).toBe(1)
  })

  it('lets one confirmed analytic speak for the technique', () => {
    expect(nodeSignal('unknown', { AN1: 'confirmed', AN2: 'pending' })).toBe(1)
  })

  it('clears an element whose analytics were all ruled out', () => {
    expect(nodeSignal('unknown', { AN1: 'not_confirmed', AN2: 'not_confirmed' })).toBeLessThan(0.2)
  })

  it('keeps the analyst verdict above whatever the analytics say', () => {
    expect(nodeSignal('false_positive', { AN1: 'confirmed' })).toBe(0)
  })

  it('rises from observed through suspicious', () => {
    expect(nodeSignal('observed')).toBeLessThan(nodeSignal('suspicious'))
    expect(nodeSignal('unknown')).toBeLessThan(nodeSignal('observed'))
  })
})

describe('signalTone', () => {
  it('walks the whole ramp rather than jumping from green to red', () => {
    const tones = [0, 0.35, 0.5, 0.7, 1].map(signalTone)
    expect(new Set(tones).size).toBe(5)
    expect(tones[0]).toBe('clear')
    expect(tones.at(-1)).toBe('confirmed')
  })

  it('puts an undecided element in the middle, not at either end', () => {
    const tone = signalTone(nodeSignal('unknown'))
    expect(tone).not.toBe('clear')
    expect(tone).not.toBe('confirmed')
  })
})
