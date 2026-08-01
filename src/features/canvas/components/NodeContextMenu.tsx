import { useEffect, useRef } from 'react'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import { useI18n } from '../../../shared/i18n'
import './NodeContextMenu.css'

export interface ContextMenuState {
  nodeId: string
  x: number
  y: number
}

interface NodeContextMenuProps {
  menu: ContextMenuState
  onClose: () => void
}

export function NodeContextMenu({ menu, onClose }: NodeContextMenuProps) {
  const { t } = useI18n()
  const duplicateNode = useInvestigationStore((s) => s.duplicateNode)
  const removeNode = useInvestigationStore((s) => s.removeNode)
  const rootRef = useRef<HTMLDivElement>(null)

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

  return (
    <div
      ref={rootRef}
      className="node-context-menu"
      style={{ left: menu.x, top: menu.y }}
      role="menu"
      aria-label={t('canvas.nodeActions')}
    >
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          duplicateNode(menu.nodeId)
          onClose()
        }}
      >
        {t('details.duplicate')}
      </button>
      <button
        type="button"
        role="menuitem"
        className="node-context-menu__danger"
        onClick={() => {
          removeNode(menu.nodeId)
          onClose()
        }}
      >
        {t('details.delete')}
      </button>
    </div>
  )
}
