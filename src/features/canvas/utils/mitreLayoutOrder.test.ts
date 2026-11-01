import { describe, expect, it } from 'vitest'
import { COLUMN_WIDTH, ROW_HEIGHT, TECHNIQUE_START_Y, layoutLikeMitre } from './mitreLayout'
import type { InvestigationNode } from '../../../shared/types/investigation'
import type { MitreTactic, MitreTechnique } from '../../../shared/types/knowledge'

const tactics: MitreTactic[] = [
  { id: 'TA0001', name: { en: 'Initial Access' }, shortName: 'initial-access' },
  { id: 'TA0003', name: { en: 'Persistence' }, shortName: 'persistence' },
]

function technique(id: string, tacticIds: string[]): MitreTechnique {
  return {
    id,
    name: id,
    type: id.includes('.') ? 'mitre_subtechnique' : 'mitre_technique',
    tactics: tacticIds,
    platforms: [],
    brief: { en: '' },
    expected_evidence: [],
    related_hypotheses: [],
    suggested_checks: [],
    detection_analytics: [],
    references: [],
  }
}

function card(definitionId: string, navigatorScore: number): InvestigationNode {
  return {
    id: `n-${definitionId}`,
    definitionId,
    type: definitionId.includes('.') ? 'mitre_subtechnique' : 'mitre_technique',
    label: definitionId,
    state: 'unknown',
    position: { x: 0, y: 0 },
    fields: {},
    navigatorScore,
    createdAt: '',
    updatedAt: '',
  }
}

const techniques = [
  technique('T1078', ['TA0001']),
  technique('T1190', ['TA0001']),
  technique('T1566', ['TA0001']),
  technique('T1566.001', ['TA0001']),
  technique('T1053', ['TA0003']),
]
const nodes = [
  card('T1078', 16),
  card('T1190', 16),
  card('T1566', 4),
  card('T1566.001', 13),
  card('T1053', 9),
]

/** The cards of one column, from the top down. */
function column(positions: Map<string, { x: number; y: number }>, index: number): string[] {
  return [...positions.entries()]
    .filter(([, p]) => p.x === index * COLUMN_WIDTH && p.y >= TECHNIQUE_START_Y)
    .sort((a, b) => a[1].y - b[1].y)
    .map(([id]) => id.replace('n-', ''))
}

describe('layoutLikeMitre with an order', () => {
  it('stacks each column from the highest score down', () => {
    const positions = layoutLikeMitre(nodes, tactics, techniques, {
      order: 'score',
      direction: 'desc',
    })
    // A subtechnique stands on its own here, so 13 sits above its parent's 4.
    expect(column(positions, 0)).toEqual(['T1078', 'T1190', 'T1566.001', 'T1566'])
    expect(column(positions, 1)).toEqual(['T1053'])
  })

  it('stacks each column from the lowest score up when ascending', () => {
    const positions = layoutLikeMitre(nodes, tactics, techniques, {
      order: 'score',
      direction: 'asc',
    })
    expect(column(positions, 0)).toEqual(['T1566', 'T1566.001', 'T1078', 'T1190'])
  })

  it('keeps a subtechnique under its parent in technique order', () => {
    const positions = layoutLikeMitre(nodes, tactics, techniques, {
      order: 'technique',
      direction: 'asc',
    })
    expect(column(positions, 0)).toEqual(['T1078', 'T1190', 'T1566', 'T1566.001'])
  })

  it('reverses the technique order when descending, children still under their parent', () => {
    const positions = layoutLikeMitre(nodes, tactics, techniques, {
      order: 'technique',
      direction: 'desc',
    })
    expect(column(positions, 0)).toEqual(['T1566', 'T1566.001', 'T1190', 'T1078'])
  })

  it('puts rows one ROW_HEIGHT apart', () => {
    const positions = layoutLikeMitre(nodes, tactics, techniques, {
      order: 'score',
      direction: 'desc',
    })
    expect(positions.get('n-T1078')!.y).toBe(TECHNIQUE_START_Y)
    expect(positions.get('n-T1190')!.y).toBe(TECHNIQUE_START_Y + ROW_HEIGHT)
  })

  it('places a subtechnique the knowledge base does not know under its parent column', () => {
    const lonely = [card('T1053.005', 20)]
    const positions = layoutLikeMitre([...nodes, ...lonely], tactics, techniques, {
      order: 'score',
      direction: 'desc',
    })
    expect(positions.get('n-T1053.005')!.x).toBe(COLUMN_WIDTH)
  })

  it('leaves the original order alone when no order is given', () => {
    const positions = layoutLikeMitre(nodes, tactics, techniques)
    expect(column(positions, 0)).toEqual(['T1078', 'T1190', 'T1566', 'T1566.001'])
  })
})

describe('layoutLikeMitre packed by measured sizes', () => {
  const sizes = new Map([
    ['n-T1078', { width: 200, height: 100 }],
    ['n-T1190', { width: 260, height: 140 }],
    ['n-T1566', { width: 200, height: 100 }],
    ['n-T1566.001', { width: 200, height: 100 }],
    ['n-T1053', { width: 180, height: 80 }],
  ])
  const sizeOf = (id: string) => sizes.get(id)
  const order = { order: 'score', direction: 'desc' } as const

  it('stacks cards right under each other, a small gap apart', () => {
    const positions = layoutLikeMitre(nodes, tactics, techniques, order, {
      spacing: 'tight',
      sizeOf,
    })
    // Tight leaves 4 px: T1078 is 100 tall, so the next card starts 104 below it.
    const first = positions.get('n-T1078')!
    const second = positions.get('n-T1190')!
    expect(second.x).toBe(first.x)
    expect(second.y - first.y).toBe(100 + 4)
  })

  it('makes a column as wide as its widest card', () => {
    const positions = layoutLikeMitre(nodes, tactics, techniques, order, {
      spacing: 'tight',
      sizeOf,
    })
    // The first column holds a 260 wide card; the next column starts after it plus the 8 px gap.
    expect(positions.get('n-T1053')!.x).toBe(positions.get('n-T1078')!.x + 260 + 8)
  })

  it('leaves more room at the compact spacing than at the tightest', () => {
    const tight = layoutLikeMitre(nodes, tactics, techniques, order, { spacing: 'tight', sizeOf })
    const compact = layoutLikeMitre(nodes, tactics, techniques, order, {
      spacing: 'compact',
      sizeOf,
    })
    expect(compact.get('n-T1053')!.x).toBeGreaterThan(tight.get('n-T1053')!.x)
    expect(compact.get('n-T1190')!.y).toBeGreaterThan(tight.get('n-T1190')!.y)
  })

  it('never lets two cards of a column overlap', () => {
    const positions = layoutLikeMitre(nodes, tactics, techniques, order, {
      spacing: 'tight',
      sizeOf,
    })
    const ids = column(positions, 0)
    for (let i = 1; i < ids.length; i += 1) {
      const above = positions.get(`n-${ids[i - 1]}`)!
      const below = positions.get(`n-${ids[i]}`)!
      expect(below.y).toBeGreaterThanOrEqual(above.y + sizes.get(`n-${ids[i - 1]}`)!.height)
    }
  })

  it('skips a column that has nothing in it', () => {
    const onlyPersistence = [card('T1053', 9)]
    const positions = layoutLikeMitre(onlyPersistence, tactics, techniques, order, {
      spacing: 'tight',
      sizeOf,
    })
    expect(positions.get('n-T1053')!.x).toBe(0)
  })

  it('uses a sensible size for a card that has not been drawn yet', () => {
    const positions = layoutLikeMitre(nodes, tactics, techniques, order, {
      spacing: 'tight',
      sizeOf: () => undefined,
    })
    const [a, b] = column(positions, 0)
      .slice(0, 2)
      .map((id) => positions.get(`n-${id}`)!)
    expect(b.y - a.y).toBe(104 + 4)
  })
})
