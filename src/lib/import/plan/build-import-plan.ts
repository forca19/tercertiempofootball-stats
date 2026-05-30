import { isSeasonCurrent, resolveTeamSlug } from '../config/load-config'
import type { ImportConfig } from '../config/load-config'
import { parseFilename } from '../parse/parse-filename'
import { parseWorkbook } from '../parse/parse-workbook'
import { normalizeSeasonName } from '../normalize/normalize-season'
import { normalizeSheetRows } from '../normalize/normalize-values'
import {
  createPlayerNormalizer,
  validateFileBlockedMerges,
} from '../normalize/normalize-player'
import type {
  FileImportResult,
  ImportPlan,
  NormalizedRow,
  PlannedOperation,
  ImportOptions,
} from '../types'
import { STAT_FIELDS } from '../types'
import { discoverWorkbooks } from '../parse/discover-files'

function sumStats(rows: NormalizedRow[]): ImportPlan['statTotals'] {
  const totals = { goals: 0, assists: 0, saves: 0, matches: 0 }
  for (const row of rows) {
    for (const field of STAT_FIELDS) {
      totals[field] += row.stats[field]
    }
  }
  return totals
}

function buildOperations(rows: NormalizedRow[], config: ImportConfig): PlannedOperation[] {
  const ops: PlannedOperation[] = []
  const teamSlugs = new Set<string>()
  const seasons = new Set<string>()
  const players = new Set<string>()

  for (const row of rows) {
    teamSlugs.add(row.teamSlug)
    seasons.add(`${row.teamSlug}::${row.seasonName}`)
    players.add(row.canonicalPlayerName)
  }

  for (const slug of [...teamSlugs].sort()) {
    const teamKey = Object.entries(config.teamMapping.teams).find(
      ([, team]) => team.slug === slug
    )?.[0]
    const name = teamKey ? config.teamMapping.teams[teamKey].name : slug
    ops.push({ kind: 'ensure_team', slug, name })
  }

  for (const key of [...seasons].sort()) {
    const [teamSlug, seasonName] = key.split('::')
    ops.push({
      kind: 'ensure_season',
      teamSlug,
      seasonName,
      isCurrent: isSeasonCurrent(config.teamMapping, teamSlug, seasonName),
    })
  }

  for (const name of [...players].sort()) {
    ops.push({ kind: 'ensure_player', canonicalName: name })
  }

  for (const row of rows) {
    ops.push({
      kind: 'ensure_roster',
      teamSlug: row.teamSlug,
      seasonName: row.seasonName,
      canonicalName: row.canonicalPlayerName,
    })
    ops.push({
      kind: 'upsert_stats',
      teamSlug: row.teamSlug,
      seasonName: row.seasonName,
      canonicalName: row.canonicalPlayerName,
      stats: row.stats,
    })
  }

  return ops
}

export function buildImportPlan(config: ImportConfig, options: ImportOptions = {}): ImportPlan {
  const startedAt = new Date().toISOString()
  const filePaths = discoverWorkbooks(config.importsDir, options.fileFilter)
  const playerNormalizer = createPlayerNormalizer(config.aliases)

  const configErrors = playerNormalizer.validateConfig()
  const fileResults: FileImportResult[] = []
  const allRows: NormalizedRow[] = []
  const errors: string[] = [...configErrors]
  const warnings: string[] = []

  for (const filePath of filePaths) {
    const fileErrors: string[] = []
    const fileWarnings: string[] = []

    try {
      const meta = parseFilename(filePath)
      const parsed = parseWorkbook(meta)
      const { slug: teamSlug } = resolveTeamSlug(config.teamMapping, meta.teamKey)
      const seasonName = normalizeSeasonName(meta.seasonLabel)
      const { rows: headerRows, errors: headerErrors, warnings: headerWarnings } =
        normalizeSheetRows(parsed)

      fileErrors.push(...headerErrors)
      fileWarnings.push(...headerWarnings)

      const normalizedRows: NormalizedRow[] = []
      const mergePairs: Array<{ raw: string; canonical: string }> = []

      for (const row of headerRows) {
        const { canonical, warnings: playerWarnings } = playerNormalizer.normalize(row.playerName)
        mergePairs.push({ raw: row.playerName, canonical })
        fileWarnings.push(...playerWarnings)

        normalizedRows.push({
          sourceFile: meta.fileName,
          teamKey: meta.teamKey,
          teamSlug,
          seasonName,
          rawPlayerName: row.playerName,
          canonicalPlayerName: canonical,
          stats: row.stats,
          unmappedColumns: row.unmappedColumns,
          warnings: playerWarnings,
        })
      }

      fileErrors.push(...validateFileBlockedMerges(config.aliases, mergePairs))

      fileResults.push({
        file: meta,
        rows: normalizedRows,
        errors: fileErrors,
        warnings: fileWarnings,
        skipped: fileErrors.length > 0,
      })

      if (fileErrors.length === 0) {
        allRows.push(...normalizedRows)
      } else {
        errors.push(...fileErrors.map(message => `${meta.fileName}: ${message}`))
      }
      warnings.push(...fileWarnings.map(message => `${meta.fileName}: ${message}`))
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      errors.push(`${filePath}: ${message}`)
      fileResults.push({
        file: {
          filePath,
          fileName: filePath.split('/').pop() ?? filePath,
          teamKey: 'Unknown',
          seasonLabel: '',
        },
        rows: [],
        errors: [message],
        warnings: [],
        skipped: true,
      })
    }
  }

  const blockedErrors = playerNormalizer.validateBlockedMerges(
    allRows.map(row => row.canonicalPlayerName)
  )
  errors.push(...blockedErrors)

  const operations = errors.length === 0 || !options.strict ? buildOperations(allRows, config) : []

  return {
    mode: options.write ? 'write' : 'dry-run',
    startedAt,
    filesScanned: filePaths.length,
    fileResults,
    operations,
    rows: allRows,
    errors,
    warnings,
    blockedMergesOk: blockedErrors.length === 0 && configErrors.length === 0,
    statTotals: sumStats(allRows),
  }
}
