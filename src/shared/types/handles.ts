/**
 * Connection points rendered on every side of a canvas node.
 *
 * Each side exposes both a source and a target handle sharing the same id, so an
 * analyst can drag either end of a connection to whichever side of a node reads
 * best. React Flow resolves sourceHandle against source-typed handles and
 * targetHandle against target-typed ones, so the ids may safely overlap.
 */
export const HANDLE_IDS = ['top', 'right', 'bottom', 'left'] as const

export type HandleId = (typeof HANDLE_IDS)[number]

export function isHandleId(value: string | undefined | null): value is HandleId {
  return value !== undefined && value !== null && (HANDLE_IDS as readonly string[]).includes(value)
}
