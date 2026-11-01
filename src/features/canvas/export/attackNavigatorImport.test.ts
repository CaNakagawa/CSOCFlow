import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { NavigatorImportError, parseNavigatorLayer } from './attackNavigatorImport'

/** A real file, straight out of the ATT&CK Navigator 5.3.2 for ATT&CK v19. */
const REAL_LAYER = readFileSync(
  path.resolve('src/features/canvas/export/__fixtures__/navigator-layer.json'),
  'utf-8',
)

function layer(techniques: unknown[], rest: Record<string, unknown> = {}) {
  return JSON.stringify({ name: 'layer', domain: 'enterprise-attack', techniques, ...rest })
}

describe('parseNavigatorLayer', () => {
  it('reads a layer the Navigator itself wrote', () => {
    const imported = parseNavigatorLayer(REAL_LAYER)

    // 124 cells in the file, but a technique is one card wherever it appears.
    expect(imported.entries).toHaveLength(101)
    expect(imported.attackVersion).toBe('19')
    expect(imported.name).toBe('layer')
  })

  it('gathers every tactic column a technique appears in', () => {
    const imported = parseNavigatorLayer(REAL_LAYER)
    const validAccounts = imported.entries.find((e) => e.techniqueId === 'T1078')

    expect(validAccounts!.tactics).toEqual([
      'stealth',
      'persistence',
      'privilege-escalation',
      'initial-access',
    ])
  })

  it('treats the empty strings the Navigator writes as nothing at all', () => {
    const imported = parseNavigatorLayer(REAL_LAYER)

    expect(imported.entries.every((e) => e.color === undefined)).toBe(true)
    expect(imported.entries.every((e) => e.comment === undefined)).toBe(true)
    expect(imported.entries.every((e) => e.score === undefined)).toBe(true)
  })

  it('keeps a colour, a comment and a score when the author set them', () => {
    const imported = parseNavigatorLayer(
      layer([
        {
          techniqueID: 'T1110',
          tactic: 'credential-access',
          color: '#a855f7',
          comment: 'seen',
          score: 60,
        },
      ]),
    )

    expect(imported.entries[0]).toEqual({
      techniqueId: 'T1110',
      tactics: ['credential-access'],
      color: '#a855f7',
      comment: 'seen',
      score: 60,
    })
  })

  it('keeps the higher score when one technique fills two cells', () => {
    const imported = parseNavigatorLayer(
      layer([
        { techniqueID: 'T1078', tactic: 'persistence', score: 20 },
        { techniqueID: 'T1078', tactic: 'initial-access', score: 90 },
      ]),
    )

    expect(imported.entries).toHaveLength(1)
    expect(imported.entries[0].score).toBe(90)
  })

  it('leaves out a cell the author switched off', () => {
    const imported = parseNavigatorLayer(
      layer([
        { techniqueID: 'T1110', tactic: 'credential-access', enabled: false },
        { techniqueID: 'T1003', tactic: 'credential-access', enabled: true },
      ]),
    )

    expect(imported.entries.map((e) => e.techniqueId)).toEqual(['T1003'])
  })

  it('ignores an id that is not a technique id', () => {
    const imported = parseNavigatorLayer(
      layer([{ techniqueID: 'T1110' }, { techniqueID: 'TA0006' }, { techniqueID: 'not a thing' }]),
    )

    expect(imported.entries.map((e) => e.techniqueId)).toEqual(['T1110'])
  })

  it('accepts a subtechnique', () => {
    const imported = parseNavigatorLayer(layer([{ techniqueID: 'T1110.001' }]))

    expect(imported.entries[0].techniqueId).toBe('T1110.001')
  })

  it('takes only the techniques the author marked, when any are marked', () => {
    const imported = parseNavigatorLayer(
      layer([
        // Expanding subtechniques writes an entry for every technique that has
        // any, which is layout state rather than a choice.
        { techniqueID: 'T1003', tactic: 'credential-access', showSubtechniques: true },
        { techniqueID: 'T1547', tactic: 'persistence', showSubtechniques: true },
        // These three the author actually did something to.
        { techniqueID: 'T1059', tactic: 'execution', score: 100 },
        { techniqueID: 'T1037', tactic: 'persistence', color: '#e60d0d' },
        { techniqueID: 'T1112', tactic: 'stealth', comment: 'run key written' },
      ]),
    )

    expect(imported.entries.map((e) => e.techniqueId)).toEqual(['T1037', 'T1059', 'T1112'])
    expect(imported.ignored).toBe(2)
  })

  it('reads a layer whole when nothing in it is marked', () => {
    const imported = parseNavigatorLayer(REAL_LAYER)

    // Every entry here exists only because subtechniques were expanded.
    expect(imported.entries).toHaveLength(101)
    expect(imported.ignored).toBe(0)
  })

  it('counts a technique as marked wherever the mark sits', () => {
    const imported = parseNavigatorLayer(
      layer([
        { techniqueID: 'T1078', tactic: 'persistence' },
        { techniqueID: 'T1078', tactic: 'initial-access', score: 40 },
        { techniqueID: 'T1003', tactic: 'credential-access' },
      ]),
    )

    expect(imported.entries.map((e) => e.techniqueId)).toEqual(['T1078'])
    expect(imported.entries[0].tactics).toEqual(['persistence', 'initial-access'])
  })

  it('turns away something that is not JSON', () => {
    expect(() => parseNavigatorLayer('nope')).toThrow(NavigatorImportError)
  })

  it('turns away a file that is not a layer at all', () => {
    const investigation = JSON.stringify({ schemaVersion: '1.0.0', canvas: { nodes: [] } })
    expect(() => parseNavigatorLayer(investigation)).toThrow('notALayer')
  })

  it('turns away a layer with nothing usable in it', () => {
    expect(() => parseNavigatorLayer(layer([]))).toThrow('noTechniques')
  })

  it('does not choke on fields a newer Navigator adds', () => {
    const imported = parseNavigatorLayer(
      layer([{ techniqueID: 'T1110', somethingNew: true, links: [], metadata: [] }], {
        aggregateFunction: 'average',
        selectVisibleTechniques: false,
      }),
    )

    expect(imported.entries).toHaveLength(1)
  })

  describe('colours from a gradient', () => {
    const GRADIENT = { colors: ['#ff6666ff', '#ffe766ff', '#8ec843ff'], minValue: 1, maxValue: 26 }

    function scored(extra: Record<string, unknown> = {}) {
      return layer(
        [
          { techniqueID: 'T1105', tactic: 'command-and-control', score: 26, color: '' },
          { techniqueID: 'T1078', tactic: 'persistence', score: 1, color: '' },
          { techniqueID: 'T1078', tactic: 'initial-access', score: 1, color: '' },
        ],
        { gradient: GRADIENT, ...extra },
      )
    }

    it('paints a scored technique that has no colour of its own, as the Navigator would', () => {
      const imported = parseNavigatorLayer(scored())
      const byId = new Map(imported.entries.map((e) => [e.techniqueId, e]))

      expect(byId.get('T1078')!.color).toBe('#ff6666')
      expect(byId.get('T1105')!.color).toBe('#8ec843')
      expect(imported.scale).toEqual({ colors: ['#ff6666', '#ffe766', '#8ec843'], min: 1, max: 26 })
    })

    it('keeps the score next to the colour', () => {
      const imported = parseNavigatorLayer(scored())
      expect(imported.entries.find((e) => e.techniqueId === 'T1105')!.score).toBe(26)
    })

    it('leaves a colour the author painted by hand alone', () => {
      const imported = parseNavigatorLayer(
        layer(
          [
            { techniqueID: 'T1105', score: 26, color: '#e60d0d' },
            { techniqueID: 'T1078', score: 1, color: '' },
          ],
          { gradient: GRADIENT },
        ),
      )
      const byId = new Map(imported.entries.map((e) => [e.techniqueId, e]))

      expect(byId.get('T1105')!.color).toBe('#e60d0d')
      expect(byId.get('T1078')!.color).toBe('#ff6666')
    })

    it('reports no scale when every colour was painted by hand', () => {
      const imported = parseNavigatorLayer(
        layer([{ techniqueID: 'T1583.006', score: 1, color: '#e60d0d' }], { gradient: GRADIENT }),
      )
      expect(imported.scale).toBeUndefined()
      expect(imported.entries[0].color).toBe('#e60d0d')
    })

    it('uses the Navigator default scale when a scored layer has no gradient block', () => {
      const imported = parseNavigatorLayer(layer([{ techniqueID: 'T1105', score: 100 }]))
      expect(imported.entries[0].color).toBe('#8ec843')
      expect(imported.scale).toMatchObject({ min: 0, max: 100 })
    })

    it('does not invent a colour for a technique that has no score', () => {
      const imported = parseNavigatorLayer(
        layer([
          { techniqueID: 'T1105', comment: 'look here' },
          { techniqueID: 'T1078', score: 5 },
        ]),
      )
      expect(imported.entries.find((e) => e.techniqueId === 'T1105')?.color).toBeUndefined()
    })
  })
})
