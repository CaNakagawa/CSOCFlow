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
 * The canvas keyboard: Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl+Y redo,
 * Ctrl/Cmd+A select all, Ctrl/Cmd+C and Ctrl/Cmd+V copy and paste,
 * Ctrl/Cmd+D duplicate, and Escape to drop the selection.
 */
export function useEditShortcuts(): void {
  const undo = useInvestigationStore((s) => s.undo)
  const redo = useInvestigationStore((s) => s.redo)
  const duplicateNode = useInvestigationStore((s) => s.duplicateNode)
  const selectAllNodes = useInvestigationStore((s) => s.selectAllNodes)
  const setSelectedNodes = useInvestigationStore((s) => s.setSelectedNodes)
  const copySelection = useInvestigationStore((s) => s.copySelection)
  const pasteClipboard = useInvestigationStore((s) => s.pasteClipboard)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isTextEntry(event.target)) return

      // Escape is the one that works without a modifier.
      if (event.key === 'Escape') {
        setSelectedNodes([])
        return
      }
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return

      const key = event.key.toLowerCase()

      if (key === 'a') {
        event.preventDefault()
        selectAllNodes()
        return
      }
      if (key === 'c') {
        event.preventDefault()
        copySelection()
        return
      }
      if (key === 'v') {
        event.preventDefault()
        pasteClipboard()
        return
      }

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
        const selected = useInvestigationStore.getState().selectedNodeIds
        if (selected.length === 0) return
        event.preventDefault()
        selected.forEach((id) => duplicateNode(id))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, duplicateNode, selectAllNodes, setSelectedNodes, copySelection, pasteClipboard])
}
