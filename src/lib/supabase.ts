import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type Season = { id: string; name: string; is_current: boolean }
export type Team   = { id: string; slug: string; name: string; logo_url: string | null }

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
  is_current: boolean
  goals: number
  assists: number
  matches: number
  roster_id: string
}

export type TeamStats = {
  team: Team
  season: Season
  players: PlayerStatRow[]
  totals: { goals: number; assists: number; matches: number }
}

export async function getAllSeasons(): Promise<Season[]> {
  const { data, error } = await supabase.from('seasons').select('*').order('name', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getCurrentSeason(): Promise<Season | null> {
  const { data } = await supabase.from('seasons').select('*').eq('is_current', true).single()
  return data ?? null
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
    .from('player_stats_view').select('*').eq('player_id', playerId).order('season_name', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getTeamStats(teamSlug: string, seasonId: string): Promise<TeamStats | null> {
  const { data: team } = await supabase.from('teams').select('*').eq('slug', teamSlug).single()
  if (!team) return null
  const { data: season } = await supabase.from('seasons').select('*').eq('id', seasonId).single()
  if (!season) return null
  const { data: rows, error } = await supabase
    .from('player_stats_view').select('*').eq('team_id', team.id).eq('season_id', seasonId).order('player_name')
  if (error) throw error
  const players = rows ?? []
  const totals = players.reduce(
    (acc, p) => ({ goals: acc.goals + p.goals, assists: acc.assists + p.assists, matches: Math.max(acc.matches, p.matches) }),
    { goals: 0, assists: 0, matches: 0 }
  )
  return { team, season, players, totals }
}

export async function upsertPlayer(data: {
  name: string; number?: number | null; position?: string | null; photo_url?: string | null
}): Promise<Player> {
  const { data: existing } = await supabaseAdmin.from('players').select('*').ilike('name', data.name.trim()).single()
  if (existing) {
    const { data: updated, error } = await supabaseAdmin.from('players')
      .update({ number: data.number ?? existing.number, position: data.position ?? existing.position, photo_url: data.photo_url ?? existing.photo_url })
      .eq('id', existing.id).select().single()
    if (error) throw error
    return updated
  }
  const { data: created, error } = await supabaseAdmin.from('players')
    .insert({ name: data.name.trim(), number: data.number, position: data.position, photo_url: data.photo_url })
    .select().single()
  if (error) throw error
  return created
}

export async function ensureRoster(playerId: string, teamId: string, seasonId: string): Promise<string> {
  const { data: existing } = await supabaseAdmin.from('team_roster').select('id')
    .eq('player_id', playerId).eq('team_id', teamId).eq('season_id', seasonId).single()
  if (existing) return existing.id
  const { data, error } = await supabaseAdmin.from('team_roster')
    .insert({ player_id: playerId, team_id: teamId, season_id: seasonId }).select('id').single()
  if (error) throw error
  return data.id
}

export async function upsertStats(rosterId: string, stats: { goals: number; assists: number; matches: number }): Promise<void> {
  const { error } = await supabaseAdmin.from('stats')
    .upsert({ roster_id: rosterId, ...stats, updated_at: new Date().toISOString() }, { onConflict: 'roster_id' })
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
