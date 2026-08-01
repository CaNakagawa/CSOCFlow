import { useEffect, useMemo, useRef } from 'react'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import { parentTechniqueId } from '../../correlation/engine/buildSubtechniqueEdges'
import type { KnowledgeBase } from '../../../shared/types/knowledge'
import { useI18n } from '../../../shared/i18n'
import './NodeContextMenu.css'

export interface ContextMenuState {
  nodeId: string
  x: number
  y: number
}

interface NodeContextMenuProps {
  menu: ContextMenuState
  knowledgeBase: KnowledgeBase | null
  onClose: () => void
}

export function NodeContextMenu({ menu, knowledgeBase, onClose }: NodeContextMenuProps) {
  const { t, locale } = useI18n()
  const duplicateNode = useInvestigationStore((s) => s.duplicateNode)
  const removeNode = useInvestigationStore((s) => s.removeNode)
  const expandSubtechniques = useInvestigationStore((s) => s.expandSubtechniques)
  const node = useInvestigationStore((s) => s.nodes.find((n) => n.id === menu.nodeId))
  const rootRef = useRef<HTMLDivElement>(null)

  // Only techniques that actually have subtechniques get the option.
  const subtechniqueCount = useMemo(() => {
    if (!knowledgeBase || node?.type !== 'mitre_technique') return 0
    return knowledgeBase.techniques.filter(
      (tech) => parentTechniqueId(tech.id) === node.definitionId,
    ).length
  }, [knowledgeBase, node])

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
      {subtechniqueCount > 0 && knowledgeBase && (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            expandSubtechniques(menu.nodeId, knowledgeBase, locale)
            onClose()
          }}
        >
          {t('canvas.expandSubtechniques', { count: String(subtechniqueCount) })}
        </button>
      )}
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
