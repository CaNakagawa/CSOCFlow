/**
 * Handle ids rendered by the canvas nodes.
 *
 * React Flow silently drops an edge whose sourceHandle names a target handle
 * (or vice versa), so the inference code and GenericNode must agree on which id
 * belongs to which side. Both import from here to keep that impossible to break.
 */
export const SOURCE_HANDLE_IDS = ['bottom', 'right'] as const
export const TARGET_HANDLE_IDS = ['top', 'left'] as const

export type SourceHandleId = (typeof SOURCE_HANDLE_IDS)[number]
export type TargetHandleId = (typeof TARGET_HANDLE_IDS)[number]

export function isSourceHandleId(value: string | undefined): value is SourceHandleId {
  return value !== undefined && (SOURCE_HANDLE_IDS as readonly string[]).includes(value)
}

export function isTargetHandleId(value: string | undefined): value is TargetHandleId {
  return value !== undefined && (TARGET_HANDLE_IDS as readonly string[]).includes(value)
}
