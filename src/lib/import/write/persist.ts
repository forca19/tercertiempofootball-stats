import type { ImportPlan, NormalizedRow, WriteResult } from '../types'

type SupabaseAdmin = typeof import('@/lib/supabase').supabaseAdmin

async function getSupabaseAdmin(): Promise<SupabaseAdmin> {
  const { supabaseAdmin } = await import('@/lib/supabase')
  return supabaseAdmin
}

type IdMaps = {
  teams: Map<string, string>
  seasons: Map<string, string>
  players: Map<string, string>
  rosters: Map<string, string>
}

function seasonKey(teamSlug: string, seasonName: string): string {
  return `${teamSlug}::${seasonName}`
}

function rosterKey(teamSlug: string, seasonName: string, playerName: string): string {
  return `${teamSlug}::${seasonName}::${playerName}`
}

async function ensureTeams(plan: ImportPlan, maps: IdMaps): Promise<number> {
  const supabaseAdmin = await getSupabaseAdmin()
  let created = 0
  const slugs = [
    ...new Set(plan.operations.filter(o => o.kind === 'ensure_team').map(o => o.slug)),
  ]

  for (const slug of slugs) {
    const { data: existing } = await supabaseAdmin.from('teams').select('id').eq('slug', slug).maybeSingle()
    if (existing) {
      maps.teams.set(slug, existing.id)
      continue
    }

    const op = plan.operations.find(o => o.kind === 'ensure_team' && o.slug === slug)
    const name = op && op.kind === 'ensure_team' ? op.name : slug

    const { data, error } = await supabaseAdmin
      .from('teams')
      .insert({ slug, name })
      .select('id')
      .single()

    if (error) throw new Error(`Failed to create team ${slug}: ${error.message}`)
    maps.teams.set(slug, data.id)
    created++
  }

  return created
}

async function ensureSeasons(plan: ImportPlan, maps: IdMaps): Promise<number> {
  const supabaseAdmin = await getSupabaseAdmin()
  let created = 0
  const seasonOps = plan.operations.filter(o => o.kind === 'ensure_season')

  for (const op of seasonOps) {
    if (op.kind !== 'ensure_season') continue
    const teamId = maps.teams.get(op.teamSlug)
    if (!teamId) throw new Error(`Team not resolved: ${op.teamSlug}`)

    const key = seasonKey(op.teamSlug, op.seasonName)
    const { data: existing } = await supabaseAdmin
      .from('seasons')
      .select('id, is_current')
      .eq('team_id', teamId)
      .eq('name', op.seasonName)
      .maybeSingle()

    if (existing) {
      maps.seasons.set(key, existing.id)
      if (op.isCurrent && !existing.is_current) {
        await supabaseAdmin.from('seasons').update({ is_current: false }).eq('team_id', teamId).neq('id', existing.id)
        await supabaseAdmin.from('seasons').update({ is_current: true }).eq('id', existing.id)
      }
      continue
    }

    if (op.isCurrent) {
      await supabaseAdmin.from('seasons').update({ is_current: false }).eq('team_id', teamId)
    }

    const { data, error } = await supabaseAdmin
      .from('seasons')
      .insert({
        team_id: teamId,
        name: op.seasonName,
        is_current: op.isCurrent,
      })
      .select('id')
      .single()

    if (error) throw new Error(`Failed to create season ${op.seasonName}: ${error.message}`)
    maps.seasons.set(key, data.id)
    created++
  }

  return created
}

async function ensurePlayers(rows: NormalizedRow[], maps: IdMaps): Promise<number> {
  const supabaseAdmin = await getSupabaseAdmin()
  let created = 0
  const names = [...new Set(rows.map(r => r.canonicalPlayerName))]

  for (const name of names) {
    const { data: existing } = await supabaseAdmin
      .from('players')
      .select('id, name')
      .ilike('name', name)
      .maybeSingle()

    if (existing) {
      maps.players.set(name, existing.id)
      continue
    }

    const { data, error } = await supabaseAdmin
      .from('players')
      .insert({ name })
      .select('id')
      .single()

    if (error) throw new Error(`Failed to create player ${name}: ${error.message}`)
    maps.players.set(name, data.id)
    created++
  }

  return created
}

async function ensureRosters(rows: NormalizedRow[], maps: IdMaps): Promise<number> {
  const supabaseAdmin = await getSupabaseAdmin()
  let created = 0

  for (const row of rows) {
    const teamId = maps.teams.get(row.teamSlug)
    const seasonId = maps.seasons.get(seasonKey(row.teamSlug, row.seasonName))
    const playerId = maps.players.get(row.canonicalPlayerName)
    if (!teamId || !seasonId || !playerId) {
      throw new Error(`Missing IDs for roster: ${row.canonicalPlayerName} @ ${row.teamSlug}/${row.seasonName}`)
    }

    const key = rosterKey(row.teamSlug, row.seasonName, row.canonicalPlayerName)
    const { data: existing } = await supabaseAdmin
      .from('team_roster')
      .select('id')
      .eq('player_id', playerId)
      .eq('team_id', teamId)
      .eq('season_id', seasonId)
      .maybeSingle()

    if (existing) {
      maps.rosters.set(key, existing.id)
      continue
    }

    const { data, error } = await supabaseAdmin
      .from('team_roster')
      .insert({ player_id: playerId, team_id: teamId, season_id: seasonId })
      .select('id')
      .single()

    if (error) throw new Error(`Failed to create roster for ${row.canonicalPlayerName}: ${error.message}`)
    maps.rosters.set(key, data.id)
    created++
  }

  return created
}

async function upsertAllStats(rows: NormalizedRow[], maps: IdMaps): Promise<number> {
  const supabaseAdmin = await getSupabaseAdmin()
  let upserted = 0

  for (const row of rows) {
    const rosterId = maps.rosters.get(rosterKey(row.teamSlug, row.seasonName, row.canonicalPlayerName))
    if (!rosterId) throw new Error(`Roster not resolved for ${row.canonicalPlayerName}`)

    const payload = {
      roster_id: rosterId,
      goals: row.stats.goals,
      assists: row.stats.assists,
      saves: row.stats.saves,
      matches: row.stats.matches,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabaseAdmin.from('stats').upsert(payload, { onConflict: 'roster_id' })
    if (error) throw new Error(`Failed to upsert stats for ${row.canonicalPlayerName}: ${error.message}`)
    upserted++
  }

  return upserted
}

export async function persistImportPlan(plan: ImportPlan): Promise<WriteResult> {
  if (plan.errors.length > 0) {
    throw new Error('Cannot write import with validation errors')
  }

  const maps: IdMaps = {
    teams: new Map(),
    seasons: new Map(),
    players: new Map(),
    rosters: new Map(),
  }

  const teamsCreated = await ensureTeams(plan, maps)
  const seasonsCreated = await ensureSeasons(plan, maps)
  const playersCreated = await ensurePlayers(plan.rows, maps)
  const rostersCreated = await ensureRosters(plan.rows, maps)
  const statsUpserted = await upsertAllStats(plan.rows, maps)

  return {
    teamsCreated,
    seasonsCreated,
    playersCreated,
    rostersCreated,
    statsUpserted,
    errors: [],
  }
}
