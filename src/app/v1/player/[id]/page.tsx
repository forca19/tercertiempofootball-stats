import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getPlayerById, getPlayerCareer } from '@/lib/supabase'

interface Props {
  params: Promise<{ id: string }>
}

export default async function PlayerProfilePage({ params }: Props) {
  const { id } = await params

  const [player, career] = await Promise.all([
    getPlayerById(id),
    getPlayerCareer(id),
  ])

  if (!player) notFound()

  const totalGoals = career.reduce((s, r) => s + r.goals, 0)
  const totalAssists = career.reduce((s, r) => s + r.assists, 0)
  const totalMatches = career.reduce((s, r) => s + r.matches, 0)

  return (
    <main className="page">
      <nav>
        <Link href="javascript:history.back()" className="back-link">← Back</Link>
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

      <section className="summary-cards">
        <SummaryCard label="Career goals" value={totalGoals} />
        <SummaryCard label="Career assists" value={totalAssists} />
        <SummaryCard label="Total matches" value={totalMatches} />
        <SummaryCard label="Teams" value={new Set(career.map(r => r.team_id)).size} />
      </section>

      <section className="player-table-section">
        <h2>Career breakdown</h2>
        <div className="table-wrapper">
          <table className="player-table">
            <thead>
              <tr>
                <th>Season</th>
                <th>Team</th>
                <th>Matches</th>
                <th>Goals</th>
                <th>Assists</th>
                <th>G+A</th>
              </tr>
            </thead>
            <tbody>
              {career.map(row => (
                <tr key={row.roster_id}>
                  <td>
                    <span className={row.is_current ? 'badge-current' : 'muted'}>
                      {row.season_name}
                      {row.is_current ? ' ·  current' : ''}
                    </span>
                  </td>
                  <td>
                    <Link
                      href={`/v1/stats/${row.team_slug}?season=${row.season_id}`}
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
