import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get('name')?.trim()
  if (!name || name.length < 2) return NextResponse.json({ career: [] })

  const { data, error } = await supabase
    .from('player_stats_view')
    .select('player_name, team_name, season_name, goals, assists, matches')
    .ilike('player_name', `%${name}%`)
    .order('season_name', { ascending: false })

  if (error) return NextResponse.json({ career: [] })
  return NextResponse.json({ career: data ?? [] })
}
