import { describe, expect, it } from 'vitest'
import { strokePath } from './strokePath'

describe('strokePath', () => {
  it('draws a line through every point', () => {
    expect(
      strokePath([
        { x: 0, y: 0 },
        { x: 10, y: 5 },
        { x: 20, y: 0 },
      ]),
    ).toBe('M 0 0 L 10 5 L 20 0')
  })

  it('leaves a dot for a single tap', () => {
    expect(strokePath([{ x: 4, y: 7 }])).toBe('M 4 7 L 4 7')
  })

  it('produces nothing for an empty stroke', () => {
    expect(strokePath([])).toBe('')
  })
})
