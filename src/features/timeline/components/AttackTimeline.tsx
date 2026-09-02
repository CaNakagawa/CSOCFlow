import { useMemo, useState } from 'react'
import { useInvestigationStore } from '../../investigation/store/investigationStore'
import { buildAttackTimeline, findTimeConflicts, nextStep } from '../utils/attackTimeline'
import { nodeSignal, signalTone } from '../../canvas/utils/nodeSignal'
import { NODE_ICONS } from '../../canvas/utils/nodeIcons'
import { nodeStateKey } from '../../canvas/utils/nodeVisuals'
import type { InvestigationNode } from '../../../shared/types/investigation'
import { useI18n } from '../../../shared/i18n'
import './AttackTimeline.css'

interface AttackTimelineProps {
  onClose: () => void
}

/**
 * The investigation told as a sequence, under the canvas.
 *
 * The canvas answers "what did we find and how does it connect"; this answers
 * "what happened, in what order" — the question a room full of executives asks
 * first. Nothing is duplicated: every card here is an element of the canvas,
 * and editing one changes the other.
 */
export function AttackTimeline({ onClose }: AttackTimelineProps) {
  const { t } = useI18n()
  const nodes = useInvestigationStore((s) => s.nodes)
  const setNodeStep = useInvestigationStore((s) => s.setNodeStep)
  const setNodeEventTime = useInvestigationStore((s) => s.setNodeEventTime)
  const insertNodeAtStep = useInvestigationStore((s) => s.insertNodeAtStep)
  const selectNode = useInvestigationStore((s) => s.selectNode)
  const selectedNodeIds = useInvestigationStore((s) => s.selectedNodeIds)

  const timeline = useMemo(() => buildAttackTimeline(nodes), [nodes])
  const conflicts = useMemo(() => findTimeConflicts(timeline.steps), [timeline.steps])
  /* What is being dragged, and where it would land: both only exist mid-drag. */
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)

  function drop(target: { step: number; insert: boolean }) {
    if (!dragging) return
    if (target.insert) insertNodeAtStep(dragging, target.step)
    else setNodeStep([dragging], target.step)
    setDragging(null)
    setOver(null)
  }

  function Card({ node }: { node: InvestigationNode }) {
    const tone = signalTone(nodeSignal(node.state, node.analyticStatuses ?? {}))
    const selected = selectedNodeIds.includes(node.id)
    const outOfOrder = conflicts.has(node.id)

    return (
      <article
        className={`attack-timeline__card attack-timeline__card--${tone}${
          selected ? ' attack-timeline__card--selected' : ''
        }${dragging === node.id ? ' attack-timeline__card--dragging' : ''}`}
        style={node.color ? { borderColor: node.color } : undefined}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move'
          // Some browsers refuse to start a drag with nothing on the clipboard.
          event.dataTransfer.setData('text/plain', node.id)
          setDragging(node.id)
        }}
        onDragEnd={() => {
          setDragging(null)
          setOver(null)
        }}
        onClick={() => selectNode(node.id)}
      >
        <header>
          {node.icon && NODE_ICONS[node.icon] && (
            <svg
              viewBox="0 0 16 16"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {NODE_ICONS[node.icon]}
            </svg>
          )}
          <span className="attack-timeline__label">
            {node.label || t('canvas.labelPlaceholder')}
          </span>
        </header>

        <p className="attack-timeline__state">{t(nodeStateKey(node.state))}</p>

        <input
          className={`attack-timeline__time${outOfOrder ? ' attack-timeline__time--conflict' : ''}`}
          value={node.eventAt ?? ''}
          placeholder={t('timeline.timePlaceholder')}
          aria-label={t('timeline.timeOf', { name: node.label })}
          aria-invalid={outOfOrder}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => setNodeEventTime(node.id, event.target.value)}
        />

        {/* Said, not enforced: the analyst may be recording exactly what the
            logs say, and a story that reads backwards is theirs to explain. */}
        {outOfOrder && <p className="attack-timeline__conflict">{t('timeline.outOfOrder')}</p>}

        <div className="attack-timeline__moves">
          <button
            type="button"
            aria-label={t('timeline.moveEarlier', { name: node.label })}
            title={t('timeline.moveEarlier', { name: node.label })}
            disabled={(node.step ?? 1) <= 1}
            onClick={(event) => {
              event.stopPropagation()
              setNodeStep([node.id], (node.step ?? 1) - 1)
            }}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label={t('timeline.moveLater', { name: node.label })}
            title={t('timeline.moveLater', { name: node.label })}
            onClick={(event) => {
              event.stopPropagation()
              setNodeStep([node.id], (node.step ?? 0) + 1)
            }}
          >
            ›
          </button>
          <button
            type="button"
            className="attack-timeline__remove"
            aria-label={t('timeline.remove', { name: node.label })}
            title={t('timeline.remove', { name: node.label })}
            onClick={(event) => {
              event.stopPropagation()
              setNodeStep([node.id], null)
            }}
          >
            ✕
          </button>
        </div>
      </article>
    )
  }

  return (
    <section className="attack-timeline" aria-label={t('timeline.title')}>
      <header className="attack-timeline__bar">
        <h2>{t('timeline.title')}</h2>
        <p className="attack-timeline__hint">{t('timeline.dragHint')}</p>
        <button
          type="button"
          className="attack-timeline__close"
          onClick={onClose}
          aria-label={t('timeline.hide')}
          title={t('timeline.hide')}
        >
          ✕
        </button>
      </header>

      <div className="attack-timeline__track">
        {timeline.steps.length === 0 && (
          <p className="attack-timeline__empty">{t('timeline.empty')}</p>
        )}

        {timeline.steps.map((column, index) => (
          <div key={column.step} className="attack-timeline__slot">
            {/* A sliver between the columns: dropping here opens a new step. */}
            <div
              className={`attack-timeline__gap${
                over === `gap-${column.step}` ? ' attack-timeline__gap--over' : ''
              }`}
              onDragOver={(event) => {
                if (!dragging) return
                event.preventDefault()
                setOver(`gap-${column.step}`)
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(event) => {
                event.preventDefault()
                drop({ step: column.step, insert: true })
              }}
            />

            <div
              className={`attack-timeline__column${
                over === `col-${column.step}` ? ' attack-timeline__column--over' : ''
              }`}
              onDragOver={(event) => {
                if (!dragging) return
                event.preventDefault()
                setOver(`col-${column.step}`)
              }}
              onDragLeave={() => setOver(null)}
              onDrop={(event) => {
                event.preventDefault()
                drop({ step: column.step, insert: false })
              }}
            >
              <div className="attack-timeline__step">
                <span className="attack-timeline__ordinal">{index + 1}</span>
              </div>
              {/* Everything numbered alike stacks here: it happened together. */}
              <div className="attack-timeline__stack">
                {column.entries.map((node) => (
                  <Card key={node.id} node={node} />
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* The end of the line, so something can be dragged past everything. */}
        {timeline.steps.length > 0 && (
          <div
            className={`attack-timeline__gap attack-timeline__gap--last${
              over === 'gap-end' ? ' attack-timeline__gap--over' : ''
            }`}
            onDragOver={(event) => {
              if (!dragging) return
              event.preventDefault()
              setOver('gap-end')
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(event) => {
              event.preventDefault()
              drop({ step: nextStep(nodes), insert: false })
            }}
          />
        )}
      </div>

      {timeline.unplaced.length > 0 && (
        <div className="attack-timeline__tray">
          <span className="attack-timeline__tray-label">
            {t('timeline.unplaced', { count: String(timeline.unplaced.length) })}
          </span>
          {timeline.unplaced.map((node) => (
            <button
              key={node.id}
              type="button"
              className="attack-timeline__chip"
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', node.id)
                setDragging(node.id)
              }}
              onDragEnd={() => {
                setDragging(null)
                setOver(null)
              }}
              onClick={() => setNodeStep([node.id], nextStep(nodes))}
              title={t('timeline.add', { name: node.label })}
            >
              {node.label || t('canvas.labelPlaceholder')}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
