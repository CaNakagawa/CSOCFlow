/**
 * Imports the full MITRE ATT&CK Enterprise catalogue into the knowledge base.
 *
 * Hand-curated techniques live in their own file under public/data/mitre/techniques/
 * and carry the teaching content (investigation_context) plus pt/de translations.
 * Everything else is generated into a single bundled file so the app makes one
 * request instead of several hundred. Curated ids are skipped by the import and
 * are listed first in the manifest, so they always win.
 *
 * Usage: npm run import:mitre [path/to/enterprise-attack.json]
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const ATTACK_STIX_URL =
  'https://raw.githubusercontent.com/mitre-attack/attack-stix-data/master/enterprise-attack/enterprise-attack.json'

const dataRoot = path.resolve(import.meta.dirname, '../public/data')
const techniquesDir = path.join(dataRoot, 'mitre/techniques')
const catalogRelativePath = 'mitre/techniques/attack-catalog.json'
const cacheDir = path.resolve(import.meta.dirname, '../node_modules/.cache/attack')
const cachePath = path.join(cacheDir, 'enterprise-attack.json')

const MAX_BRIEF_LENGTH = 420

interface StixExternalReference {
  source_name: string
  external_id?: string
  url?: string
}

interface StixObject {
  id: string
  type: string
  name?: string
  description?: string
  revoked?: boolean
  x_mitre_deprecated?: boolean
  x_mitre_is_subtechnique?: boolean
  x_mitre_platforms?: string[]
  x_mitre_analytic_refs?: string[]
  x_mitre_log_source_references?: { name?: string; channel?: string }[]
  x_mitre_mutable_elements?: { field?: string; description?: string }[]
  x_mitre_shortname?: string
  tactic_refs?: string[]
  external_references?: StixExternalReference[]
  kill_chain_phases?: { kill_chain_name: string; phase_name: string }[]
  relationship_type?: string
  source_ref?: string
  target_ref?: string
}

interface Tactic {
  id: string
  name: string
  shortName: string
}

function attackId(object: StixObject): string | undefined {
  return object.external_references?.find((r) => r.source_name === 'mitre-attack')?.external_id
}

function attackUrl(object: StixObject): string | undefined {
  return object.external_references?.find((r) => r.source_name === 'mitre-attack')?.url
}

/** MITRE prose is markdown with inline citations; reduce it to plain text. */
function toPlainText(markdown: string): string {
  return markdown
    .replace(/\(Citation:[^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<\/?code>/g, '')
    .replace(/<br>/g, ' ')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Keep whole sentences up to the budget so the summary never ends mid-word. */
function toBrief(description: string): string {
  const text = toPlainText(description)
  if (text.length <= MAX_BRIEF_LENGTH) return text

  const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text]
  let brief = ''
  for (const sentence of sentences) {
    if (brief && (brief + sentence).length > MAX_BRIEF_LENGTH) break
    brief += sentence
  }
  brief = brief.trim()
  if (brief) return brief

  return `${text.slice(0, MAX_BRIEF_LENGTH).replace(/\s+\S*$/, '')}...`
}

async function loadBundle(explicitPath: string | undefined): Promise<StixObject[]> {
  const source = explicitPath ?? cachePath

  if (!existsSync(source)) {
    if (explicitPath) throw new Error(`ATT&CK bundle not found: ${explicitPath}`)
    console.log(`Downloading ATT&CK bundle from ${ATTACK_STIX_URL} ...`)
    const response = await fetch(ATTACK_STIX_URL)
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`)
    }
    await mkdir(cacheDir, { recursive: true })
    await writeFile(cachePath, Buffer.from(await response.arrayBuffer()))
  }

  const raw = JSON.parse(await readFile(source, 'utf-8')) as { objects: StixObject[] }
  return raw.objects
}

async function readCuratedIds(): Promise<Set<string>> {
  const entries = await readdir(techniquesDir)
  const ids = new Set<string>()
  for (const entry of entries) {
    if (!entry.endsWith('.json') || entry === path.basename(catalogRelativePath)) continue
    const parsed = JSON.parse(await readFile(path.join(techniquesDir, entry), 'utf-8')) as {
      id?: string
    }
    if (parsed.id) ids.add(parsed.id)
  }
  return ids
}

async function main() {
  const objects = await loadBundle(process.argv[2])
  const byStixId = new Map(objects.map((o) => [o.id, o]))

  // Regenerate tactics from the matrix so renames land here too: this release
  // renamed TA0005 Defense Evasion to Stealth and added TA0112 Defense Impairment.
  const matrix = objects.find((o) => o.type === 'x-mitre-matrix')
  if (!matrix?.tactic_refs) throw new Error('No x-mitre-matrix found in the bundle')
  const tactics: Tactic[] = matrix.tactic_refs
    .map((ref) => byStixId.get(ref))
    .filter((t): t is StixObject => t?.type === 'x-mitre-tactic')
    .map((t) => {
      const id = attackId(t)
      if (!id || !t.name || !t.x_mitre_shortname) throw new Error(`Malformed tactic ${t.id}`)
      return { id, name: t.name, shortName: t.x_mitre_shortname }
    })
  await writeFile(
    path.join(dataRoot, 'mitre/tactics.json'),
    `${JSON.stringify(tactics, null, 2)}\n`,
    'utf-8',
  )
  const tacticIdByShortName = new Map(tactics.map((t) => [t.shortName, t.id]))

  // detection-strategy --detects--> attack-pattern
  const strategiesByTechnique = new Map<string, StixObject[]>()
  for (const object of objects) {
    if (object.type !== 'relationship' || object.relationship_type !== 'detects') continue
    const strategy = byStixId.get(object.source_ref ?? '')
    const technique = byStixId.get(object.target_ref ?? '')
    if (strategy?.type !== 'x-mitre-detection-strategy') continue
    if (technique?.type !== 'attack-pattern') continue
    const list = strategiesByTechnique.get(technique.id) ?? []
    list.push(strategy)
    strategiesByTechnique.set(technique.id, list)
  }

  const curatedIds = await readCuratedIds()
  const attackPatterns = objects.filter(
    (o) => o.type === 'attack-pattern' && !o.x_mitre_deprecated && !o.revoked,
  )

  const catalog = []
  let skippedCurated = 0
  let skippedNoTactic = 0
  let analyticCount = 0

  for (const pattern of attackPatterns) {
    const id = attackId(pattern)
    if (!id) continue
    if (curatedIds.has(id)) {
      skippedCurated += 1
      continue
    }

    const tacticIds = (pattern.kill_chain_phases ?? [])
      .filter((p) => p.kill_chain_name === 'mitre-attack')
      .map((p) => tacticIdByShortName.get(p.phase_name))
      .filter((t): t is string => Boolean(t))
    const uniqueTactics = [...new Set(tacticIds)]
    if (uniqueTactics.length === 0) {
      skippedNoTactic += 1
      continue
    }

    const detectionAnalytics = []
    for (const strategy of strategiesByTechnique.get(pattern.id) ?? []) {
      const strategyId = attackId(strategy)
      if (!strategyId) continue
      for (const analyticRef of strategy.x_mitre_analytic_refs ?? []) {
        const analytic = byStixId.get(analyticRef)
        const analyticIdValue = analytic && attackId(analytic)
        if (!analytic || !analyticIdValue || !analytic.description) continue
        detectionAnalytics.push({
          id: analyticIdValue,
          detectionStrategyId: strategyId,
          description: { en: toPlainText(analytic.description) },
          url:
            attackUrl(analytic) ??
            `https://attack.mitre.org/detectionstrategies/${strategyId}#${analyticIdValue}`,
          platforms: analytic.x_mitre_platforms ?? [],
          // Carried through so the app can build hunting query skeletons that
          // point at the data source MITRE actually names for this analytic.
          logSources: (analytic.x_mitre_log_source_references ?? [])
            .filter((ref) => ref.name)
            .map((ref) => ({ name: ref.name ?? '', channel: ref.channel ?? '' })),
          mutableElements: (analytic.x_mitre_mutable_elements ?? [])
            .filter((element) => element.field)
            .map((element) => ({
              field: element.field ?? '',
              description: toPlainText(element.description ?? ''),
            })),
        })
      }
    }
    analyticCount += detectionAnalytics.length

    catalog.push({
      id,
      name: pattern.name ?? id,
      type: pattern.x_mitre_is_subtechnique ? 'mitre_subtechnique' : 'mitre_technique',
      tactics: uniqueTactics,
      platforms: pattern.x_mitre_platforms ?? [],
      brief: { en: toBrief(pattern.description ?? '') },
      expected_evidence: [],
      related_hypotheses: [],
      suggested_checks: [],
      detection_analytics: detectionAnalytics,
      references: [
        {
          title: 'MITRE ATT&CK',
          url: attackUrl(pattern) ?? `https://attack.mitre.org/techniques/`,
        },
      ],
    })
  }

  catalog.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }))
  await writeFile(
    path.join(dataRoot, catalogRelativePath),
    `${JSON.stringify(catalog, null, 2)}\n`,
    'utf-8',
  )

  // Curated files stay ahead of the generated catalogue in the manifest.
  const manifestPath = path.join(dataRoot, 'manifest.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf-8')) as { techniques: string[] }
  manifest.techniques = [
    ...manifest.techniques.filter((p) => p !== catalogRelativePath),
    catalogRelativePath,
  ]
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8')

  const subtechniques = catalog.filter((t) => t.type === 'mitre_subtechnique').length
  console.log(
    `Wrote ${tactics.length} tactics.\n` +
      `Imported ${catalog.length} techniques (${catalog.length - subtechniques} parent, ` +
      `${subtechniques} sub) with ${analyticCount} detection analytics.\n` +
      `Kept ${skippedCurated} curated techniques untouched.` +
      (skippedNoTactic ? ` Skipped ${skippedNoTactic} without an enterprise tactic.` : ''),
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
