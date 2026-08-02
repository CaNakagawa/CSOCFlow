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
 * Ctrl/Cmd+A select all, Ctrl/Cmd+C copy, Ctrl/Cmd+D duplicate, and Escape to
 * drop the selection. Pasting is handled by the canvas, on the paste event.
 */
export function useEditShortcuts(): void {
  const undo = useInvestigationStore((s) => s.undo)
  const redo = useInvestigationStore((s) => s.redo)
  const duplicateNode = useInvestigationStore((s) => s.duplicateNode)
  const selectAllNodes = useInvestigationStore((s) => s.selectAllNodes)
  const setSelectedNodes = useInvestigationStore((s) => s.setSelectedNodes)
  const copySelection = useInvestigationStore((s) => s.copySelection)

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
      /*
       * Ctrl+V is deliberately not handled here. Cancelling the keystroke would
       * also cancel the browser's own paste event, and that event is the only
       * way to see a picture on the clipboard. The canvas listens for `paste`
       * instead and decides there between a picture and copied elements.
       */

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
  }, [undo, redo, duplicateNode, selectAllNodes, setSelectedNodes, copySelection])
}
