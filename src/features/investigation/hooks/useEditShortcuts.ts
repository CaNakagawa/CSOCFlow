import { useEffect } from 'react'
import { useInvestigationStore } from '../store/investigationStore'

/** Typing in a field must keep the browser's own text undo, not ours. */
function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

/**
 * Ctrl/Cmd+Z to undo, Ctrl/Cmd+Shift+Z or Ctrl+Y to redo, Ctrl/Cmd+D to
 * duplicate the selection.
 */
export function useEditShortcuts(): void {
  const undo = useInvestigationStore((s) => s.undo)
  const redo = useInvestigationStore((s) => s.redo)
  const duplicateNode = useInvestigationStore((s) => s.duplicateNode)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return
      if (isTextEntry(event.target)) return

      const key = event.key.toLowerCase()

      if (key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
        return
      }
      if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault()
        redo()
        return
      }
      if (key === 'd') {
        const selected = useInvestigationStore.getState().selectedNodeId
        if (!selected) return
        event.preventDefault()
        duplicateNode(selected)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, duplicateNode])
}
