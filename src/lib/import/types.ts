/** Shared types for the spreadsheet import pipeline (architecture v1.1.0). */

export type StatField = 'goals' | 'assists' | 'saves' | 'matches'

export type CanonicalStats = Record<StatField, number>

export type PlayerAliasEntry = {
  canonical: string
  aliases: string[]
  confidence?: string
  notes?: string
}

export type BlockedMerge = {
  id: string
  names: string[]
  status: string
  rule: string
}

export type DeterministicPair = {
  from: string
  to: string
}

export type PlayerAliasesConfig = {
  version: string
  updated: string
  players: PlayerAliasEntry[]
  blocked_merges: BlockedMerge[]
  auto_normalize: {
    deterministic_pairs: DeterministicPair[]
  }
}

export type TeamMappingConfig = {
  teams: Record<string, { slug: string; name: string }>
  season_current: Record<string, string>
}

export type ParsedFileMeta = {
  filePath: string
  fileName: string
  teamKey: string
  seasonLabel: string
}

export type RawSheetRow = Record<string, string | number | null>

export type ParsedFile = ParsedFileMeta & {
  sheetName: string
  headers: string[]
  rows: RawSheetRow[]
}

export type NormalizedRow = {
  sourceFile: string
  teamKey: string
  teamSlug: string
  seasonName: string
  rawPlayerName: string
  canonicalPlayerName: string
  stats: CanonicalStats
  unmappedColumns: string[]
  warnings: string[]
}

export type FileImportResult = {
  file: ParsedFileMeta
  rows: NormalizedRow[]
  errors: string[]
  warnings: string[]
  skipped: boolean
}

export type PlannedOperation =
  | { kind: 'ensure_team'; slug: string; name: string }
  | { kind: 'ensure_season'; teamSlug: string; seasonName: string; isCurrent: boolean }
  | { kind: 'ensure_player'; canonicalName: string }
  | { kind: 'ensure_roster'; teamSlug: string; seasonName: string; canonicalName: string }
  | {
      kind: 'upsert_stats'
      teamSlug: string
      seasonName: string
      canonicalName: string
      stats: CanonicalStats
    }

export type ImportPlan = {
  mode: 'dry-run' | 'write'
  startedAt: string
  filesScanned: number
  fileResults: FileImportResult[]
  operations: PlannedOperation[]
  rows: NormalizedRow[]
  errors: string[]
  warnings: string[]
  blockedMergesOk: boolean
  statTotals: CanonicalStats
}

export type ImportReport = ImportPlan & {
  finishedAt: string
  reportPath?: string
  writeResult?: WriteResult
}

export type WriteResult = {
  teamsCreated: number
  seasonsCreated: number
  playersCreated: number
  rostersCreated: number
  statsUpserted: number
  errors: string[]
}

export type ImportOptions = {
  importsDir?: string
  write?: boolean
  reportPath?: string
  fileFilter?: string
  strict?: boolean
}

export const EMPTY_STATS: CanonicalStats = {
  goals: 0,
  assists: 0,
  saves: 0,
  matches: 0,
}

export const STAT_FIELDS: StatField[] = ['goals', 'assists', 'saves', 'matches']
