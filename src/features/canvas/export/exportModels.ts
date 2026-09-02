import { EXPORT_HIDDEN_CLASS, fitIntoSlide, toFileName, type RenderedImage } from './canvasImage'

/** What the analyst chose to hand over. */
export type ExportModel = 'canvas' | 'timeline' | 'both' | 'report'

export type PictureFormat = 'png' | 'jpg' | 'pdf' | 'pptx'

/** Pixels of margin left around a stacked composition. */
const GAP = 24

function download(dataUrl: string, fileName: string): void {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = fileName
  link.click()
}

/**
 * Photographs a piece of the page as it stands.
 *
 * Used for the timeline and the report, which are ordinary DOM: unlike the
 * canvas they need no transform, since what is on screen is already the whole
 * of them.
 */
export async function captureElement(
  element: HTMLElement,
  backgroundColor: string,
  format: 'png' | 'jpeg' = 'png',
): Promise<RenderedImage> {
  const { toPng, toJpeg } = await import('html-to-image')
  const render = format === 'png' ? toPng : toJpeg
  const width = Math.ceil(element.scrollWidth)
  const height = Math.ceil(element.scrollHeight)

  const dataUrl = await render(element, {
    backgroundColor,
    width,
    height,
    quality: 0.95,
    filter: (node) =>
      !(node instanceof HTMLElement && node.classList.contains(EXPORT_HIDDEN_CLASS)),
    style: { width: `${width}px`, height: `${height}px` },
  })

  return { dataUrl, width, height }
}

/**
 * Puts a piece of HTML on the page where nobody can see it, photographs it,
 * and takes it away again.
 *
 * Off-screen rather than hidden: `display: none` has no layout, and an element
 * with no layout has nothing to photograph.
 */
export async function captureHtml(html: string, backgroundColor: string): Promise<RenderedImage> {
  const host = document.createElement('div')
  host.style.position = 'fixed'
  host.style.top = '0'
  host.style.left = '-20000px'
  host.style.zIndex = '-1'
  host.innerHTML = html
  document.body.appendChild(host)

  try {
    const target = (host.firstElementChild as HTMLElement | null) ?? host
    // Web fonts land after layout; without this the capture can catch the
    // fallback face mid-swap and come out with the wrong metrics.
    if (document.fonts?.ready) await document.fonts.ready
    return await captureElement(target, backgroundColor)
  } finally {
    host.remove()
  }
}

/**
 * Draws several images down a single sheet.
 *
 * This is what "both" means: the board and the sequence on one picture, in
 * that order, rather than two files the reader has to hold side by side.
 */
export async function stackImages(
  images: RenderedImage[],
  backgroundColor: string,
): Promise<RenderedImage> {
  if (images.length === 1) return images[0]

  const width = Math.max(...images.map((image) => image.width))
  const height = images.reduce((sum, image) => sum + image.height, 0) + GAP * (images.length - 1)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser gave no 2D canvas to compose the export on.')

  context.fillStyle = backgroundColor
  context.fillRect(0, 0, width, height)

  let y = 0
  for (const image of images) {
    const element = new Image()
    element.src = image.dataUrl
    await element.decode()
    // Centred: a narrow timeline under a wide board should not hug the edge.
    context.drawImage(element, Math.round((width - image.width) / 2), y)
    y += image.height + GAP
  }

  return { dataUrl: canvas.toDataURL('image/png'), width, height }
}

/** Hands a composition to the browser in the shape the analyst asked for. */
export async function deliver(
  images: RenderedImage[],
  format: PictureFormat,
  title: string,
  backgroundColor: string,
): Promise<void> {
  if (format === 'png' || format === 'jpg') {
    const single = await stackImages(images, backgroundColor)
    download(single.dataUrl, toFileName(title, format))
    return
  }

  if (format === 'pdf') {
    const { jsPDF } = await import('jspdf')
    let document_: InstanceType<typeof jsPDF> | null = null

    // One page per picture, each page cut to its own picture: a report page and
    // a wide board do not share sensible dimensions.
    for (const image of images) {
      const orientation = image.width >= image.height ? 'landscape' : 'portrait'
      if (!document_) {
        document_ = new jsPDF({
          orientation,
          unit: 'px',
          format: [image.width, image.height],
          compress: true,
        })
      } else {
        document_.addPage([image.width, image.height], orientation)
      }
      document_.addImage(image.dataUrl, 'PNG', 0, 0, image.width, image.height)
    }

    document_?.save(toFileName(title, 'pdf'))
    return
  }

  const { default: PptxGenJS } = await import('pptxgenjs')
  const presentation = new PptxGenJS()
  presentation.layout = 'LAYOUT_16x9'
  for (const image of images) {
    const slide = presentation.addSlide()
    slide.addImage({ data: image.dataUrl, ...fitIntoSlide(image.width, image.height) })
  }
  await presentation.writeFile({ fileName: toFileName(title, 'pptx') })
}
