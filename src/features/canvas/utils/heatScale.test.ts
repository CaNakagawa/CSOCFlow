import { describe, expect, it } from 'vitest'
import { DEFAULT_HEAT_COLORS, heatColor, heatGradientCss, parseHeatScale } from './heatScale'

/** The gradient block of the layer this was written for. */
const GRADIENT = { colors: ['#ff6666ff', '#ffe766ff', '#8ec843ff'], minValue: 1, maxValue: 26 }

describe('parseHeatScale', () => {
  it('reads the gradient the Navigator writes, dropping the alpha byte', () => {
    expect(parseHeatScale(GRADIENT)).toEqual({
      colors: ['#ff6666', '#ffe766', '#8ec843'],
      min: 1,
      max: 26,
    })
  })

  it('accepts short and plain hex colours', () => {
    const scale = parseHeatScale({ colors: ['#f00', '#00ff00'], minValue: 0, maxValue: 10 })
    expect(scale?.colors).toEqual(['#ff0000', '#00ff00'])
  })

  it('gives up on a gradient it cannot use', () => {
    expect(parseHeatScale(undefined)).toBeNull()
    expect(parseHeatScale({ colors: ['#ff0000'], minValue: 0, maxValue: 1 })).toBeNull()
    expect(parseHeatScale({ colors: ['nope', 'worse'], minValue: 0, maxValue: 1 })).toBeNull()
    expect(parseHeatScale({ colors: ['#ff0000', '#00ff00'], minValue: 5, maxValue: 1 })).toBeNull()
    expect(parseHeatScale({ colors: ['#ff0000', '#00ff00'] })).toBeNull()
  })
})

describe('heatColor', () => {
  const scale = parseHeatScale(GRADIENT)!

  it('paints the lowest score with the first colour and the highest with the last', () => {
    expect(heatColor(1, scale)).toBe('#ff6666')
    expect(heatColor(26, scale)).toBe('#8ec843')
  })

  it('lands on the middle colour halfway through the range', () => {
    expect(heatColor(13.5, scale)).toBe('#ffe766')
  })

  it('mixes between two neighbouring colours', () => {
    // A quarter of the way: halfway between the first and the middle colour.
    const quarter = heatColor(1 + 25 / 4, scale)
    expect(quarter).toBe('#ffa766')
  })

  it('keeps a score outside the range on the nearest end', () => {
    expect(heatColor(-50, scale)).toBe('#ff6666')
    expect(heatColor(500, scale)).toBe('#8ec843')
  })

  it('uses the strongest colour when the range has no width', () => {
    expect(heatColor(7, { colors: DEFAULT_HEAT_COLORS, min: 7, max: 7 })).toBe('#8ec843')
  })
})

describe('heatGradientCss', () => {
  it('lists the colours left to right', () => {
    expect(heatGradientCss(parseHeatScale(GRADIENT)!)).toBe(
      'linear-gradient(to right, #ff6666, #ffe766, #8ec843)',
    )
  })
})
