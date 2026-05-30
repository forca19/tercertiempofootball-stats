import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type TeamRow = {
  id: string
  slug: string
  name: string
  logo_url: string | null
}

type SeasonRow = {
  id: string
  team_id: string
}

type StatRow = {
  player_id: string
  player_name: string
  team_id: string
  goals: number
  assists: number
  matches: number
}

type PlayerTotals = {
  id: string
  name: string
  goals: number
  assists: number
  matches: number
}

const featuredTeams = [
  { slug: 'delfinos', name: 'Delfinos' },
  { slug: 'lideres', name: 'Líderes' },
  { slug: 'pericos', name: 'Pericos' },
]

export default async function Home() {
  const [
    { data: teamsData, error: teamsError },
    { data: seasonsData, error: seasonsError, count: seasonsCount },
    { data: statsData, error: statsError },
    { count: playersCount, error: playersError },
  ] = await Promise.all([
    supabase.from('teams').select('id, slug, name, logo_url').in('slug', featuredTeams.map(t => t.slug)),
    supabase.from('seasons').select('id, team_id', { count: 'exact' }),
    supabase.from('player_stats_view').select('player_id, player_name, team_id, goals, assists, matches'),
    supabase.from('players').select('id', { count: 'exact', head: true }),
  ])

  const firstError = teamsError ?? seasonsError ?? statsError ?? playersError
  if (firstError) throw firstError

  const teams = (teamsData ?? []) as TeamRow[]
  const seasons = (seasonsData ?? []) as SeasonRow[]
  const stats = (statsData ?? []) as StatRow[]

  const totalGoals = stats.reduce((sum, row) => sum + row.goals, 0)
  const playerTotals = getPlayerTotals(stats)
  const hallOfFame = [
    {
      label: 'Máximo goleador',
      player: getLeader(playerTotals, 'goals'),
      valueLabel: 'goles',
      stat: 'goals' as const,
    },
    {
      label: 'Máximo asistidor',
      player: getLeader(playerTotals, 'assists'),
      valueLabel: 'asistencias',
      stat: 'assists' as const,
    },
    {
      label: 'Más partidos jugados',
      player: getLeader(playerTotals, 'matches'),
      valueLabel: 'partidos',
      stat: 'matches' as const,
    },
  ]

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>Estadísticas de las principales franquicias de Tercer Tiempo S.A. de C.V.</h1>
          <p className="subtitle">
            Estadísticas históricas de equipos, temporadas y jugadores del fútbol de Tercer Tiempo.
          </p>
        </div>
      </header>

      <section className="summary-cards" aria-label="Resumen general">
        <SummaryCard label="Jugadores" value={playersCount ?? playerTotals.length} />
        <SummaryCard label="Temporadas" value={seasonsCount ?? seasons.length} />
        <SummaryCard label="Goles" value={totalGoals} />
      </section>

      <section className="player-table-section">
        <h2>Equipos</h2>
        <div className="summary-cards">
          {featuredTeams.map(featuredTeam => {
            const team = teams.find(t => t.slug === featuredTeam.slug)
            const teamId = team?.id
            const teamSeasonCount = teamId ? seasons.filter(s => s.team_id === teamId).length : 0
            const teamPlayerCount = teamId
              ? new Set(stats.filter(row => row.team_id === teamId).map(row => row.player_id)).size
              : 0

            return (
              <article key={featuredTeam.slug} className="summary-card">
                <div className="team-header-left">
                  {team?.logo_url ? (
                    <img
                      src={team.logo_url}
                      alt={`Logo de ${featuredTeam.name}`}
                      className="team-logo-lg"
                    />
                  ) : (
                    <div className="player-photo-placeholder" aria-hidden="true">
                      {featuredTeam.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3>{featuredTeam.name}</h3>
                    <p className="subtitle">
                      {teamSeasonCount} temporadas · {teamPlayerCount} jugadores
                    </p>
                  </div>
                </div>
                <Link href={`/team/${featuredTeam.slug}`} className="btn-primary">
                  Ver estadísticas
                </Link>
              </article>
            )
          })}
        </div>
      </section>

      <section className="player-table-section">
        <h2>Salón de la fama</h2>
        <div className="leaderboards">
          {hallOfFame.map(item => (
            <article key={item.label} className="leaderboard">
              <h2>{item.label}</h2>
              {item.player ? (
                <div>
                  <p className="player-name">{item.player.name}</p>
                  <p className="subtitle">
                    {item.player[item.stat]} {item.valueLabel}
                  </p>
                </div>
              ) : (
                <p className="subtitle">Sin datos todavía</p>
              )}
            </article>
          ))}
        </div>
      </section>

      <footer className="subtitle">
        Registrando goles y asistencias para que la charla del tercer tiempo tenga datos.
      </footer>
    </main>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="summary-card">
      <span className="card-label">{label}</span>
      <span className="card-value">{value}</span>
    </div>
  )
}

function getPlayerTotals(stats: StatRow[]): PlayerTotals[] {
  const totals = new Map<string, PlayerTotals>()

  for (const row of stats) {
    const current = totals.get(row.player_id) ?? {
      id: row.player_id,
      name: row.player_name,
      goals: 0,
      assists: 0,
      matches: 0,
    }

    current.goals += row.goals
    current.assists += row.assists
    current.matches += row.matches
    totals.set(row.player_id, current)
  }

  return Array.from(totals.values())
}

function getLeader(
  players: PlayerTotals[],
  stat: 'goals' | 'assists' | 'matches'
): PlayerTotals | undefined {
  return [...players].sort((a, b) => b[stat] - a[stat] || a.name.localeCompare(b.name, 'es')).at(0)
}
