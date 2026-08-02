import { useEffect, useMemo, useRef, useState } from 'react'
import Fuse from 'fuse.js'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import type { LibraryItem } from '../types/libraryItem'
import { WHITEBOARD_DEFAULT_SIZE } from '../utils/canvasDefaults'
import { useI18n } from '../../../shared/i18n'
import './PaneContextMenu.css'

const MAX_SUGGESTIONS = 8

export interface PaneMenuState {
  /** Where to put the menu, in screen coordinates. */
  x: number
  y: number
  /** Where the new element goes, in canvas coordinates. */
  flowX: number
  flowY: number
}

interface PaneContextMenuProps {
  menu: PaneMenuState
  items: LibraryItem[]
  onClose: () => void
}

/**
 * Right-clicking empty canvas offers to put something there.
 *
 * Add opens a search box over the knowledge base; submitting it empty drops a
 * blank element instead, for anything the base does not cover.
 */
export function PaneContextMenu({ menu, items, onClose }: PaneContextMenuProps) {
  const { t } = useI18n()
  const addNode = useInvestigationStore((s) => s.addNode)
  const addFreeNode = useInvestigationStore((s) => s.addFreeNode)
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fuse = useMemo(
    () => new Fuse(items, { keys: ['label', 'brief'], threshold: 0.35 }),
    [items],
  )
  const suggestions = useMemo(
    () =>
      query.trim().length === 0
        ? []
        : fuse.search(query, { limit: MAX_SUGGESTIONS }).map((hit) => hit.item),
    [fuse, query],
  )

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as globalThis.Node)) onClose()
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const position = { x: menu.flowX, y: menu.flowY }

  function addFromLibrary(item: LibraryItem) {
    addNode({
      nodeType: item.nodeType,
      definitionId: item.definitionId,
      label: item.label,
      position,
      fieldDefinitions: item.fieldDefinitions,
    })
    onClose()
  }

  function addBlank() {
    // Nothing typed: a bare element the analyst names themselves.
    addFreeNode({ nodeType: 'evidence', label: '', position })
    onClose()
  }

  return (
    <div
      ref={rootRef}
      className="pane-menu"
      style={{ left: menu.x, top: menu.y }}
      role="menu"
      aria-label={t('canvas.paneActions')}
    >
      {!adding ? (
        <>
          <button type="button" role="menuitem" onClick={() => setAdding(true)}>
            {t('canvas.add')}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              addFreeNode({ nodeType: 'text', label: '', position })
              onClose()
            }}
          >
            {t('canvas.addText')}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              addFreeNode({
                nodeType: 'whiteboard',
                label: '',
                position,
                size: WHITEBOARD_DEFAULT_SIZE,
              })
              onClose()
            }}
          >
            {t('canvas.addWhiteboard')}
          </button>
        </>
      ) : (
        <div className="pane-menu__search">
          <input
            ref={inputRef}
            type="search"
            value={query}
            placeholder={t('canvas.addSearchPlaceholder')}
            aria-label={t('canvas.addSearchPlaceholder')}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              if (suggestions.length > 0) addFromLibrary(suggestions[0])
              else addBlank()
            }}
          />
          <ul className="pane-menu__suggestions">
            {suggestions.map((item) => (
              <li key={item.definitionId}>
                <button type="button" onClick={() => addFromLibrary(item)}>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="pane-menu__blank" onClick={addBlank}>
            {t('canvas.addBlank')}
          </button>
        </div>
      )}
    </div>
  )
}
