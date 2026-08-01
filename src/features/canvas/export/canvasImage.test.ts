import { describe, expect, it } from 'vitest'
import { fitIntoSlide, planCanvasImage, toFileName } from './canvasImage'

describe('planCanvasImage', () => {
  it('frames the drawing with padding on every side', () => {
    const plan = planCanvasImage({ x: 0, y: 0, width: 100, height: 50 }, { padding: 10, scale: 1 })

    expect(plan.width).toBe(120)
    expect(plan.height).toBe(70)
    expect(plan.transform).toBe('translate(10px, 10px) scale(1)')
  })

  it('brings a drawing that sits far from the origin back into frame', () => {
    const plan = planCanvasImage(
      { x: 500, y: -200, width: 100, height: 50 },
      { padding: 10, scale: 1 },
    )

    expect(plan.transform).toBe('translate(-490px, 210px) scale(1)')
  })

  it('renders above screen resolution so text survives a slide', () => {
    const plan = planCanvasImage({ x: 0, y: 0, width: 100, height: 50 }, { padding: 0, scale: 2 })

    expect(plan.width).toBe(200)
    expect(plan.height).toBe(100)
  })

  it('scales a huge canvas down instead of asking for an image no browser will draw', () => {
    const plan = planCanvasImage(
      { x: 0, y: 0, width: 20000, height: 400 },
      { padding: 0, scale: 2, maxSide: 8000 },
    )

    expect(plan.width).toBe(8000)
    expect(plan.height).toBe(160)
  })

  it('still produces an image for a single point of interest', () => {
    const plan = planCanvasImage({ x: 0, y: 0, width: 0, height: 0 }, { padding: 4, scale: 1 })

    expect(plan.width).toBeGreaterThan(0)
    expect(plan.height).toBeGreaterThan(0)
  })
})

describe('fitIntoSlide', () => {
  const slide = { width: 10, height: 5.625, margin: 0.3 }

  it('centres a 16:9 image and leaves the margins alone', () => {
    // Slightly taller than the usable area, so the height is what binds.
    const rect = fitIntoSlide(1920, 1080, slide)

    expect(rect.h).toBeCloseTo(5.025)
    expect(rect.y).toBeCloseTo(0.3)
    expect(rect.w).toBeCloseTo((5.025 * 1920) / 1080)
    expect(rect.x).toBeCloseTo((10 - rect.w) / 2)
  })

  it('fits a very wide image to the usable width', () => {
    const rect = fitIntoSlide(4000, 1000, slide)

    expect(rect.w).toBeCloseTo(9.4)
    expect(rect.x).toBeCloseTo(0.3)
    expect(rect.h).toBeLessThan(5.025)
  })

  it('fits a tall image to the slide height rather than cropping it', () => {
    const rect = fitIntoSlide(1000, 4000, slide)

    expect(rect.h).toBeCloseTo(5.025)
    expect(rect.w).toBeLessThan(9.4)
    expect(rect.y).toBeCloseTo(0.3)
  })
})

describe('toFileName', () => {
  it('keeps the investigation title and adds the extension', () => {
    expect(toFileName('Phishing wave 2026-08', 'png')).toBe('Phishing wave 2026-08.png')
  })

  it('drops characters a filesystem would reject', () => {
    expect(toFileName('IR/2026: "urgent"', 'pdf')).toBe('IR-2026- -urgent-.pdf')
  })

  it('falls back to a generic name when the title is empty', () => {
    expect(toFileName('   ', 'pptx')).toBe('investigation.pptx')
  })
})
