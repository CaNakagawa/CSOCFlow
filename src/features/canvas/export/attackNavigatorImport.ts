import { z } from 'zod'

/**
 * One technique taken out of a Navigator layer, already reduced to what the
 * canvas can use.
 */
export interface NavigatorEntry {
  techniqueId: string
  /** Every tactic column the layer put this technique in. */
  tactics: string[]
  /** A colour the author painted the cell with, if they painted one. */
  color?: string
  comment?: string
  score?: number
}

export interface NavigatorImport {
  name: string
  attackVersion?: string
  entries: NavigatorEntry[]
  /** Techniques the layer carries but that were left out as layout state. */
  ignored: number
}

/*
 * Deliberately loose. A layer is written by the Navigator, by another tool, or
 * by hand, and every field but the technique list is optional in practice —
 * the file MITRE's own Navigator writes carries no scores at all. Unknown keys
 * are ignored rather than rejected, so a newer Navigator does not break this.
 */
const layerSchema = z.object({
  name: z.string().optional(),
  domain: z.string().optional(),
  versions: z
    .object({
      attack: z.string().optional(),
      navigator: z.string().optional(),
      layer: z.string().optional(),
    })
    .optional(),
  techniques: z
    .array(
      z.object({
        techniqueID: z.string().min(1),
        tactic: z.string().optional(),
        color: z.string().optional(),
        comment: z.string().optional(),
        score: z.number().optional(),
        enabled: z.boolean().optional(),
      }),
    )
    .optional(),
})

export class NavigatorImportError extends Error {
  constructor(reason: string) {
    super(reason)
    this.name = 'NavigatorImportError'
  }
}

/** A technique id as MITRE writes it: T1110, or T1110.001 for a subtechnique. */
const TECHNIQUE_ID = /^T\d{4}(\.\d{3})?$/

function looksLikeLayer(data: unknown): boolean {
  return (
    typeof data === 'object' &&
    data !== null &&
    'techniques' in data &&
    Array.isArray((data as { techniques: unknown }).techniques)
  )
}

/**
 * Reads a Navigator layer file.
 *
 * A technique that sits in several tactics appears once per column in the
 * layer; here it becomes one entry carrying all its columns, because the canvas
 * holds one card per technique, not one per cell.
 *
 * A disabled cell is left out: the author switched it off on purpose.
 */
export function parseNavigatorLayer(text: string): NavigatorImport {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new NavigatorImportError('notJson')
  }

  if (!looksLikeLayer(data)) throw new NavigatorImportError('notALayer')

  const result = layerSchema.safeParse(data)
  if (!result.success) {
    const detail = result.error.issues
      .slice(0, 3)
      .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
      .join('; ')
    throw new NavigatorImportError(detail)
  }

  const byTechnique = new Map<string, NavigatorEntry>()

  for (const cell of result.data.techniques ?? []) {
    if (cell.enabled === false) continue
    const techniqueId = cell.techniqueID.trim().toUpperCase()
    if (!TECHNIQUE_ID.test(techniqueId)) continue

    const entry = byTechnique.get(techniqueId) ?? { techniqueId, tactics: [] }
    if (cell.tactic && !entry.tactics.includes(cell.tactic)) entry.tactics.push(cell.tactic)

    // The Navigator writes "" for a colour or comment nobody set.
    const color = cell.color?.trim()
    if (color) entry.color = color
    const comment = cell.comment?.trim()
    if (comment) entry.comment = comment
    // Of two cells for one technique, the higher score is the one worth keeping.
    if (typeof cell.score === 'number' && (entry.score === undefined || cell.score > entry.score)) {
      entry.score = cell.score
    }

    byTechnique.set(techniqueId, entry)
  }

  if (byTechnique.size === 0) throw new NavigatorImportError('noTechniques')

  /*
   * A layer records annotations, never the selection: clicking cells in the
   * Navigator leaves no trace in the file, while expanding subtechniques
   * writes an entry for every technique that has any. So a technique carrying
   * a score, a colour or a comment is one the author meant something by, and
   * when a layer has such techniques the rest is layout state — import the
   * marked ones alone. A layer with no marks anywhere is read whole, since
   * then the list itself is the point.
   */
  const all = [...byTechnique.values()].sort((a, b) =>
    a.techniqueId.localeCompare(b.techniqueId, 'en', { numeric: true }),
  )
  const marked = all.filter(
    (entry) =>
      entry.score !== undefined || entry.color !== undefined || entry.comment !== undefined,
  )
  const entries = marked.length > 0 ? marked : all

  return {
    name: result.data.name?.trim() || '',
    attackVersion: result.data.versions?.attack,
    entries,
    ignored: all.length - entries.length,
  }
}
