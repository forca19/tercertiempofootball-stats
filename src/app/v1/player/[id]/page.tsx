import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPlayerById, getPlayerCareer } from '@/lib/supabase'
import type { PlayerStatRow } from '@/lib/supabase'
import BackButton from '@/components/navigation/BackButton'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ team?: string; season?: string }>
}

export default async function PlayerProfilePage({ params, searchParams }: Props) {
  const { id } = await params
  const { team: teamContext, season: seasonContext } = await searchParams

  const [player, career] = await Promise.all([
    getPlayerById(id),
    getPlayerCareer(id),
  ])

  if (!player) notFound()

  const totalGoals = career.reduce((s, r) => s + r.goals, 0)
  const totalAssists = career.reduce((s, r) => s + r.assists, 0)
  const totalMatches = career.reduce((s, r) => s + r.matches, 0)
  const contextTeamRow = career.find(row =>
    row.team_slug === teamContext && (!seasonContext || row.season_id === seasonContext)
  )
  const primaryTeamRow = contextTeamRow ?? career.find(row => row.is_current) ?? career[0]
  const seasonsCount = new Set(career.map(r => r.season_id)).size

  return (
    <main className="page">
      <nav style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {primaryTeamRow ? (
          <Link
            href={getTeamHref(primaryTeamRow)}
            className="back-link"
          >
            ← Equipo
          </Link>
        ) : (
          <BackButton>← Equipo</BackButton>
        )}
        <Link href="/" className="back-link">Inicio</Link>
      </nav>

      <header className="player-header">
        <div className="player-photo-wrap">
          {player.photo_url ? (
            <img
              src={player.photo_url}
              alt={player.name}
              className="player-photo"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <div className="player-photo-placeholder">
              {player.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <div className="player-header-info">
          <h1>{player.name}</h1>
          <p className="subtitle">
            {[player.position, player.number ? `#${player.number}` : null]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      </header>

      <section className="player-table-section">
        <h2>Estadísticas de carrera</h2>
        <div className="summary-cards">
          <SummaryCard label="Goles" value={totalGoals} />
          <SummaryCard label="Asistencias" value={totalAssists} />
          <SummaryCard label="Partidos" value={totalMatches} />
          <SummaryCard label="Temporadas" value={seasonsCount} />
        </div>
      </section>

      <section className="player-table-section">
        <h2>Historial por temporada</h2>
        <div className="table-wrapper">
          <table className="player-table">
            <thead>
              <tr>
                <th>Temporada</th>
                <th>Equipo</th>
                <th>Partidos</th>
                <th>Goles</th>
                <th>Asistencias</th>
                <th>G+A</th>
              </tr>
            </thead>
            <tbody>
              {career.map(row => (
                <tr key={row.roster_id}>
                  <td>
                    <span className={row.is_current ? 'badge-current' : 'muted'}>
                      {row.season_name}
                      {row.is_current ? ' · actual' : ''}
                    </span>
                  </td>
                  <td>
                    <Link
                      href={getTeamHref(row)}
                      className="team-link"
                    >
                      {row.team_logo_url && (
                        <img
                          src={row.team_logo_url}
                          alt={row.team_name}
                          className="team-logo-sm"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      )}
                      {row.team_name}
                    </Link>
                  </td>
                  <td>{row.matches}</td>
                  <td className="stat-goals">{row.goals}</td>
                  <td className="stat-assists">{row.assists}</td>
                  <td className="stat-total">{row.goals + row.assists}</td>
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

function getTeamHref(row: PlayerStatRow) {
  return row.is_current ? `/team/${row.team_slug}` : `/team/${row.team_slug}?season=${row.season_id}`
}
