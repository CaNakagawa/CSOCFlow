import { describe, expect, it } from 'vitest'
import { buildEdgeLabelStyle } from './edgeLabelStyle'

describe('buildEdgeLabelStyle', () => {
  it('paints the label with the theme tokens', () => {
    const style = buildEdgeLabelStyle((name) => (name === '--fg' ? '#ffffff' : '#000033'))

    expect(style.fill).toBe('#ffffff')
    expect(style.stroke).toBe('#000033')
  })

  it('draws the halo behind the glyphs rather than over them', () => {
    const style = buildEdgeLabelStyle(() => '#ffffff')

    expect(style.paintOrder).toBe('stroke')
    expect(style.strokeWidth).toBeGreaterThan(0)
  })

  it('falls back to readable colours when the tokens cannot be read', () => {
    const style = buildEdgeLabelStyle(() => '')

    expect(style.fill).toBeTruthy()
    expect(style.stroke).toBeTruthy()
    expect(style.fill).not.toBe(style.stroke)
  })

  it('carries the font on the element, since an export loses the stylesheet', () => {
    const style = buildEdgeLabelStyle(() => '#ffffff')

    expect(style.fontFamily).toContain('system-ui')
    expect(style.fontSize).toBeTruthy()
  })
})
