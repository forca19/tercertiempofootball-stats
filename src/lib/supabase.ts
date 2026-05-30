import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type Season = {
  id: string
  team_id: string
  name: string
  is_current: boolean
}

export type Team = { id: string; slug: string; name: string; logo_url: string | null }

export type Player = {
  id: string
  name: string
  number: number | null
  position: string | null
  photo_url: string | null
}

export type PlayerStatRow = {
  player_id: string
  player_name: string
  number: number | null
  position: string | null
  player_photo_url: string | null
  team_id: string
  team_name: string
  team_slug: string
  team_logo_url: string | null
  season_id: string
  season_name: string
  season_sort_order: number | null
  is_current: boolean
  goals: number
  assists: number
  matches: number
  roster_id: string
}

export type TeamStats = {
  team: Team
  season: Season
  seasons: Season[]
  players: PlayerStatRow[]
  totals: { goals: number; assists: number; matches: number }
}

/** Pick query season, else team current, else most recent by name order. */
export function resolveSeasonForTeam(
  seasons: Season[],
  seasonIdFromQuery?: string
): Season | undefined {
  if (seasonIdFromQuery) {
    const match = seasons.find(s => s.id === seasonIdFromQuery)
    if (match) return match
  }
  return seasons.find(s => s.is_current) ?? seasons[0]
}

export async function getTeamBySlug(slug: string): Promise<Team | null> {
  const { data, error } = await supabase.from('teams').select('*').eq('slug', slug).single()
  if (error) return null
  return data
}

export async function getSeasonsForTeam(teamId: string): Promise<Season[]> {
  const { data, error } = await supabase
    .from('seasons')
    .select('id, team_id, name, is_current')
    .eq('team_id', teamId)
    .order('sort_order', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getAllTeams(): Promise<Team[]> {
  const { data, error } = await supabase.from('teams').select('*').order('name')
  if (error) throw error
  return data ?? []
}

export async function getPlayerById(id: string): Promise<Player | null> {
  const { data } = await supabase.from('players').select('*').eq('id', id).single()
  return data ?? null
}

export async function getPlayerCareer(playerId: string): Promise<PlayerStatRow[]> {
  const { data, error } = await supabase
    .from('player_stats_view')
    .select('*')
    .eq('player_id', playerId)
  if (error) throw error

  const rows = data ?? []
  const seasonIds = [...new Set(rows.map(row => row.season_id))]
  const { data: seasonRows, error: seasonsError } = seasonIds.length
    ? await supabase
        .from('seasons')
        .select('id, sort_order')
        .in('id', seasonIds)
    : { data: [], error: null }
  if (seasonsError) throw seasonsError

  const sortOrderBySeasonId = new Map(
    (seasonRows ?? []).map(row => [row.id, row.sort_order as number | null])
  )

  return rows
    .map(row => ({
      ...row,
      season_sort_order: sortOrderBySeasonId.get(row.season_id) ?? null,
    }))
    .sort(compareCareerRowsAsc)
}

function compareCareerRowsAsc(a: PlayerStatRow, b: PlayerStatRow) {
  if (a.season_sort_order != null && b.season_sort_order != null) {
    return a.season_sort_order - b.season_sort_order
  }
  if (a.season_sort_order != null) return -1
  if (b.season_sort_order != null) return 1
  return a.season_name.localeCompare(b.season_name, 'es')
}

export async function getTeamStats(
  teamSlug: string,
  seasonIdFromQuery?: string
): Promise<TeamStats | null> {
  const team = await getTeamBySlug(teamSlug)
  if (!team) return null

  const seasons = await getSeasonsForTeam(team.id)
  if (!seasons.length) return null

  const season = resolveSeasonForTeam(seasons, seasonIdFromQuery)
  if (!season) return null

  const { data: rows, error } = await supabase
    .from('player_stats_view')
    .select('*')
    .eq('team_id', team.id)
    .eq('season_id', season.id)
    .order('player_name')
  if (error) throw error

  const players = rows ?? []
  const totals = players.reduce(
    (acc, p) => ({
      goals: acc.goals + p.goals,
      assists: acc.assists + p.assists,
      matches: Math.max(acc.matches, p.matches),
    }),
    { goals: 0, assists: 0, matches: 0 }
  )

  return { team, season, seasons, players, totals }
}

export async function upsertPlayer(data: {
  name: string
  number?: number | null
  position?: string | null
  photo_url?: string | null
}): Promise<Player> {
  const { data: existing } = await supabaseAdmin
    .from('players')
    .select('*')
    .ilike('name', data.name.trim())
    .single()
  if (existing) {
    const { data: updated, error } = await supabaseAdmin
      .from('players')
      .update({
        number: data.number ?? existing.number,
        position: data.position ?? existing.position,
        photo_url: data.photo_url ?? existing.photo_url,
      })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return updated
  }
  const { data: created, error } = await supabaseAdmin
    .from('players')
    .insert({
      name: data.name.trim(),
      number: data.number,
      position: data.position,
      photo_url: data.photo_url,
    })
    .select()
    .single()
  if (error) throw error
  return created
}

export async function ensureRoster(
  playerId: string,
  teamId: string,
  seasonId: string
): Promise<string> {
  const { data: season } = await supabaseAdmin
    .from('seasons')
    .select('id')
    .eq('id', seasonId)
    .eq('team_id', teamId)
    .maybeSingle()
  if (!season) throw new Error('Season does not belong to this team')

  const { data: existing } = await supabaseAdmin
    .from('team_roster')
    .select('id')
    .eq('player_id', playerId)
    .eq('team_id', teamId)
    .eq('season_id', seasonId)
    .single()
  if (existing) return existing.id

  const { data, error } = await supabaseAdmin
    .from('team_roster')
    .insert({ player_id: playerId, team_id: teamId, season_id: seasonId })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function upsertStats(
  rosterId: string,
  stats: { goals: number; assists: number; matches: number }
): Promise<void> {
  const { error } = await supabaseAdmin.from('stats').upsert(
    { roster_id: rosterId, ...stats, updated_at: new Date().toISOString() },
    { onConflict: 'roster_id' }
  )
  if (error) throw error
}

export async function upsertTeamLogo(teamId: string, logoUrl: string): Promise<void> {
  const { error } = await supabaseAdmin.from('teams').update({ logo_url: logoUrl }).eq('id', teamId)
  if (error) throw error
}

export async function removeFromRoster(rosterId: string): Promise<void> {
  const { error } = await supabaseAdmin.from('team_roster').delete().eq('id', rosterId)
  if (error) throw error
}
