import { NextRequest, NextResponse } from 'next/server'
import { upsertPlayer, ensureRoster, upsertStats, removeFromRoster, upsertTeamLogo } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    if (action === 'upsert_stats') {
      const { playerName, number, position, photoUrl, teamId, seasonId, goals, assists, matches } = body
      const player = await upsertPlayer({ name: playerName, number, position, photo_url: photoUrl ?? null })
      const rosterId = await ensureRoster(player.id, teamId, seasonId)
      await upsertStats(rosterId, {
        goals:   parseInt(goals)   || 0,
        assists: parseInt(assists) || 0,
        matches: parseInt(matches) || 0,
      })
      return NextResponse.json({ ok: true, player })
    }

    if (action === 'upsert_team_logo') {
      const { teamId, logoUrl } = body
      await upsertTeamLogo(teamId, logoUrl)
      return NextResponse.json({ ok: true })
    }

    if (action === 'remove_roster') {
      await removeFromRoster(body.rosterId)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    console.error('[admin API]', err)
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 })
  }
}
