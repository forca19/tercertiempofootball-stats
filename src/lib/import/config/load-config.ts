import { readFileSync } from 'fs'
import { join } from 'path'
import type { PlayerAliasesConfig, TeamMappingConfig } from '../types'

export type ImportConfig = {
  aliases: PlayerAliasesConfig
  teamMapping: TeamMappingConfig
  importsDir: string
}

const DEFAULT_IMPORTS_DIR = join(process.cwd(), 'src/imports')

export function loadImportConfig(importsDir = DEFAULT_IMPORTS_DIR): ImportConfig {
  const aliasesPath = join(importsDir, 'player-aliases.json')
  const teamMappingPath = join(importsDir, 'team-mapping.json')

  const aliases = JSON.parse(readFileSync(aliasesPath, 'utf-8')) as PlayerAliasesConfig
  const teamMapping = JSON.parse(readFileSync(teamMappingPath, 'utf-8')) as TeamMappingConfig

  return { aliases, teamMapping, importsDir }
}

export function resolveTeamSlug(
  teamMapping: TeamMappingConfig,
  teamKey: string
): { slug: string; name: string } {
  const entry = teamMapping.teams[teamKey]
  if (!entry) {
    throw new Error(`Unknown team key "${teamKey}" — add it to team-mapping.json`)
  }
  return entry
}

export function isSeasonCurrent(
  teamMapping: TeamMappingConfig,
  teamSlug: string,
  seasonName: string
): boolean {
  return teamMapping.season_current[teamSlug] === seasonName
}
