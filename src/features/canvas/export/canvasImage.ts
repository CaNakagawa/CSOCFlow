/**
 * Rendering the canvas to an image file.
 *
 * The heavy libraries behind PDF and PPTX are only fetched when the analyst
 * actually exports, so opening the app never pays for them.
 */

export type ExportFormat = 'png' | 'jpg' | 'pdf' | 'pptx'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** Blank margin around the drawing, in canvas units. */
const PADDING = 48
/** Rendered at 2x so text stays sharp in a slide or a printed page. */
const SCALE = 2
/** Beyond this a browser canvas starts failing outright on some machines. */
const MAX_SIDE = 8000

export interface ImagePlan {
  /** Pixel size of the resulting image. */
  width: number
  height: number
  /** CSS transform that brings the drawing into that frame. */
  transform: string
}

export interface PlanOptions {
  padding?: number
  scale?: number
  maxSide?: number
}

/**
 * Works out the image size and the transform that fits the drawing into it.
 *
 * The scale drops below the nominal one only when the drawing is large enough
 * that the full-resolution image would not survive being rasterised.
 */
export function planCanvasImage(
  bounds: Rect,
  { padding = PADDING, scale = SCALE, maxSide = MAX_SIDE }: PlanOptions = {},
): ImagePlan {
  const contentWidth = Math.max(1, bounds.width) + padding * 2
  const contentHeight = Math.max(1, bounds.height) + padding * 2

  const effectiveScale = Math.min(scale, maxSide / contentWidth, maxSide / contentHeight)

  const width = Math.round(contentWidth * effectiveScale)
  const height = Math.round(contentHeight * effectiveScale)
  const offsetX = (padding - bounds.x) * effectiveScale
  const offsetY = (padding - bounds.y) * effectiveScale

  return {
    width,
    height,
    transform: `translate(${offsetX}px, ${offsetY}px) scale(${effectiveScale})`,
  }
}

export interface RenderedImage {
  dataUrl: string
  width: number
  height: number
}

interface RenderOptions {
  /** The element holding the nodes and edges — React Flow's viewport. */
  element: HTMLElement
  bounds: Rect
  backgroundColor: string
  /** JPEG has no transparency, so it is the one that always needs a backdrop. */
  format: 'png' | 'jpeg'
}

export async function renderCanvasImage({
  element,
  bounds,
  backgroundColor,
  format,
}: RenderOptions): Promise<RenderedImage> {
  const plan = planCanvasImage(bounds)
  const { toPng, toJpeg } = await import('html-to-image')
  const render = format === 'png' ? toPng : toJpeg

  const dataUrl = await render(element, {
    backgroundColor,
    width: plan.width,
    height: plan.height,
    quality: 0.95,
    style: {
      width: `${plan.width}px`,
      height: `${plan.height}px`,
      transform: plan.transform,
      // The viewport is normally positioned by React Flow; pin it so the
      // transform above is the only thing placing the drawing.
      transformOrigin: '0 0',
    },
  })

  return { dataUrl, width: plan.width, height: plan.height }
}

/** A 16:9 slide, in inches — PptxGenJS's own default layout. */
const SLIDE = { width: 10, height: 5.625, margin: 0.3 }

export interface SlideRect {
  x: number
  y: number
  w: number
  h: number
}

/** Centres the image on the slide, keeping its aspect ratio. */
export function fitIntoSlide(
  imageWidth: number,
  imageHeight: number,
  slide: { width: number; height: number; margin: number } = SLIDE,
): SlideRect {
  const availableWidth = slide.width - slide.margin * 2
  const availableHeight = slide.height - slide.margin * 2
  const ratio = Math.min(availableWidth / imageWidth, availableHeight / imageHeight)
  const w = imageWidth * ratio
  const h = imageHeight * ratio

  return {
    x: (slide.width - w) / 2,
    y: (slide.height - h) / 2,
    w,
    h,
  }
}

/** Strips anything a filesystem would object to, without gutting the name. */
export function toFileName(title: string, extension: string): string {
  const base = title
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .slice(0, 80)
  return `${base.length > 0 ? base : 'investigation'}.${extension}`
}

function downloadDataUrl(dataUrl: string, fileName: string): void {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = fileName
  link.click()
}

interface ExportOptions extends Omit<RenderOptions, 'format'> {
  format: ExportFormat
  title: string
}

/**
 * Renders the canvas and hands the file to the browser.
 *
 * PDF and PPTX wrap the same rendered image: one page or slide holding the
 * whole drawing, which is what a report or a briefing deck needs.
 */
export async function exportCanvas({
  element,
  bounds,
  backgroundColor,
  format,
  title,
}: ExportOptions): Promise<void> {
  const image = await renderCanvasImage({
    element,
    bounds,
    backgroundColor,
    format: format === 'jpg' ? 'jpeg' : 'png',
  })

  if (format === 'png' || format === 'jpg') {
    downloadDataUrl(image.dataUrl, toFileName(title, format))
    return
  }

  if (format === 'pdf') {
    const { jsPDF } = await import('jspdf')
    const document_ = new jsPDF({
      orientation: image.width >= image.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [image.width, image.height],
      compress: true,
    })
    document_.addImage(image.dataUrl, 'PNG', 0, 0, image.width, image.height)
    document_.save(toFileName(title, 'pdf'))
    return
  }

  const { default: PptxGenJS } = await import('pptxgenjs')
  const presentation = new PptxGenJS()
  presentation.layout = 'LAYOUT_16x9'
  const slide = presentation.addSlide()
  slide.addImage({ data: image.dataUrl, ...fitIntoSlide(image.width, image.height) })
  await presentation.writeFile({ fileName: toFileName(title, 'pptx') })
}
