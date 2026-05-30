import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { getTeamStats } from '@/lib/supabase'
import SeasonSelector from '@/components/stats/SeasonSelector'
import type { PlayerStatRow } from '@/lib/supabase'

type Props = {
  teamSlug: string
  seasonIdFromQuery?: string
}

export default async function TeamStatsContent({ teamSlug, seasonIdFromQuery }: Props) {
  const data = await getTeamStats(teamSlug, seasonIdFromQuery)
  if (!data) notFound()

  const { team, season: activeSeason, seasons, players, totals } = data

  const topScorers = [...players].sort((a, b) => b.goals - a.goals || b.assists - a.assists).slice(0, 5)
  const topAssists = [...players].sort((a, b) => b.assists - a.assists || b.goals - a.goals).slice(0, 5)

  return (
    <main className="page">
      <nav>
        <Link href="/" className="back-link">← Inicio</Link>
      </nav>

      <header className="page-header">
        <div className="team-header-left">
          {team.logo_url && (
            <img
              src={team.logo_url}
              alt={`Logo de ${team.name}`}
              className="team-logo-lg"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
          <div>
            <h1>{team.name}</h1>
            <p className="subtitle">Temporada {activeSeason.name} · Estadísticas de jugadores</p>
          </div>
        </div>
        <Suspense>
          <SeasonSelector seasons={seasons} currentSeasonId={activeSeason.id} />
        </Suspense>
      </header>

      <section className="summary-cards">
        <SummaryCard label="Goles totales" value={totals.goals} />
        <SummaryCard label="Asistencias totales" value={totals.assists} />
        <SummaryCard label="Partidos" value={totals.matches} />
        <SummaryCard label="Jugadores" value={players.length} />
      </section>

      <section className="leaderboards">
        <Leaderboard
          title="Goleadores"
          players={topScorers}
          stat="goals"
          teamSlug={team.slug}
          seasonId={activeSeason.id}
        />
        <Leaderboard
          title="Asistencias"
          players={topAssists}
          stat="assists"
          teamSlug={team.slug}
          seasonId={activeSeason.id}
        />
      </section>

      <section className="player-table-section">
        <h2>Todos los jugadores</h2>
        <div className="table-wrapper">
          <table className="player-table">
            <thead>
              <tr>
                <th>#</th><th>Jugador</th><th>Posición</th>
                <th>Partidos</th><th>Goles</th><th>Asistencias</th><th>G+A</th>
              </tr>
            </thead>
            <tbody>
              {players.map(p => (
                <tr key={p.roster_id}>
                  <td className="muted">{p.number ?? '—'}</td>
                  <td>
                    <Link href={getPlayerHref(p.player_id, team.slug, activeSeason.id)} className="player-link">
                      {p.player_photo_url && (
                        <img
                          src={p.player_photo_url}
                          alt={p.player_name}
                          className="player-avatar"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      )}
                      <span className="player-name">{p.player_name}</span>
                    </Link>
                  </td>
                  <td className="muted">{p.position ?? '—'}</td>
                  <td>{p.matches}</td>
                  <td className="stat-goals">{p.goals}</td>
                  <td className="stat-assists">{p.assists}</td>
                  <td className="stat-total">{p.goals + p.assists}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
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

function Leaderboard({ title, players, stat, teamSlug, seasonId }: {
  title: string
  players: PlayerStatRow[]
  stat: 'goals' | 'assists'
  teamSlug: string
  seasonId: string
}) {
  const max = players[0]?.[stat] ?? 1
  return (
    <div className="leaderboard">
      <h2>{title}</h2>
      <ol className="leaderboard-list">
        {players.map((p, i) => (
          <li key={p.roster_id} className="leaderboard-row">
            <span className="rank">{i + 1}</span>
            <Link href={getPlayerHref(p.player_id, teamSlug, seasonId)} className="lb-name lb-link">
              {p.player_name}
            </Link>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${(p[stat] / max) * 100}%` }} />
            </div>
            <span className="lb-value">{p[stat]}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function getPlayerHref(playerId: string, teamSlug: string, seasonId: string) {
  return `/v1/player/${playerId}?team=${teamSlug}&season=${seasonId}`
}
