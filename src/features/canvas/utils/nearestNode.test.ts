import { describe, expect, it } from 'vitest'
import { OPPOSITE_HANDLE, findNearestNodeInDirection } from './nearestNode'
import type { InvestigationNode } from '../../../shared/types/investigation'

function node(id: string, x: number, y: number): InvestigationNode {
  return {
    id,
    definitionId: id,
    type: 'host',
    label: id,
    state: 'unknown',
    position: { x, y },
    fields: {},
    notes: '',
    createdAt: '2026-07-31T00:00:00.000Z',
    updatedAt: '2026-07-31T00:00:00.000Z',
  }
}

describe('OPPOSITE_HANDLE', () => {
  it('lands a connection on the facing side', () => {
    expect(OPPOSITE_HANDLE.right).toBe('left')
    expect(OPPOSITE_HANDLE.left).toBe('right')
    expect(OPPOSITE_HANDLE.top).toBe('bottom')
    expect(OPPOSITE_HANDLE.bottom).toBe('top')
  })
})

describe('findNearestNodeInDirection', () => {
  const origin = node('origin', 0, 0)

  it('reaches right for the nearest node on the right', () => {
    const nodes = [origin, node('far', 500, 0), node('near', 200, 0)]
    expect(findNearestNodeInDirection(nodes, 'origin', 'right')?.id).toBe('near')
  })

  it('ignores nodes on the wrong side', () => {
    const nodes = [origin, node('left', -200, 0)]
    expect(findNearestNodeInDirection(nodes, 'origin', 'right')).toBeNull()
  })

  it('picks each direction independently', () => {
    const nodes = [
      origin,
      node('r', 200, 0),
      node('l', -200, 0),
      node('d', 0, 200),
      node('u', 0, -200),
    ]
    expect(findNearestNodeInDirection(nodes, 'origin', 'right')?.id).toBe('r')
    expect(findNearestNodeInDirection(nodes, 'origin', 'left')?.id).toBe('l')
    expect(findNearestNodeInDirection(nodes, 'origin', 'bottom')?.id).toBe('d')
    expect(findNearestNodeInDirection(nodes, 'origin', 'top')?.id).toBe('u')
  })

  it('prefers something genuinely to the side over something closer but off-axis', () => {
    const nodes = [
      origin,
      // closer overall, but almost straight down
      node('below', 30, 150),
      // further, yet squarely to the right
      node('right', 300, 20),
    ]
    expect(findNearestNodeInDirection(nodes, 'origin', 'right')?.id).toBe('right')
  })

  it('still links off-axis when nothing sits inside the cone', () => {
    const nodes = [origin, node('offAxis', 40, 400)]
    expect(findNearestNodeInDirection(nodes, 'origin', 'right')?.id).toBe('offAxis')
  })

  it('never returns the node itself', () => {
    expect(findNearestNodeInDirection([origin], 'origin', 'right')).toBeNull()
  })

  it('returns null when the origin is not on the canvas', () => {
    expect(findNearestNodeInDirection([node('a', 100, 0)], 'missing', 'right')).toBeNull()
  })
})
