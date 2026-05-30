import { buildColumnMapping } from '../config/column-aliases'
import type { ParsedFile, RawSheetRow } from '../types'
import type { StatField } from '../types'
import { EMPTY_STATS, STAT_FIELDS } from '../types'

export type HeaderNormalizedRow = {
  playerName: string
  stats: typeof EMPTY_STATS
  unmappedColumns: string[]
}

function parseStatValue(value: string | number | null | undefined): number {
  if (value == null || value === '') return 0
  const parsed = typeof value === 'number' ? value : parseFloat(String(value).replace(',', '.'))
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.trunc(parsed))
}

export function normalizeSheetRows(parsed: ParsedFile): {
  rows: HeaderNormalizedRow[]
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  const mapping = buildColumnMapping(parsed.headers)

  if (mapping.playerIndex == null) {
    errors.push(`No player column found in ${parsed.fileName}`)
    return { rows: [], errors, warnings }
  }

  if (!mapping.statIndices.goals && !mapping.statIndices.assists && !mapping.statIndices.saves && !mapping.statIndices.matches) {
    warnings.push(`No stat columns mapped in ${parsed.fileName}; all stats will default to 0`)
  }

  const rows: HeaderNormalizedRow[] = []

  for (const rawRow of parsed.rows) {
    const values = parsed.headers.map(header => rawRow[header] ?? null)
    const playerName = String(values[mapping.playerIndex] ?? '').trim()
    if (!playerName) continue

    const stats = { ...EMPTY_STATS }
    for (const field of STAT_FIELDS) {
      const index = mapping.statIndices[field]
      if (index == null) continue
      stats[field] = parseStatValue(values[index])
    }

    rows.push({
      playerName,
      stats,
      unmappedColumns: [...new Set(mapping.unmappedHeaders)],
    })
  }

  return { rows, errors, warnings }
}

export function getRawRowValues(row: RawSheetRow, headers: string[]): (string | number | null)[] {
  return headers.map(header => row[header] ?? null)
}

export type { StatField }
