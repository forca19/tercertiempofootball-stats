import { getAllTeams, getAllSeasons, getCurrentSeason, getTeamStats } from '@/lib/supabase'
import AdminStatsForm from '@/components/admin/AdminStatsForm'
import AdminRosterTable from '@/components/admin/AdminRosterTable'

interface Props {
  searchParams: { team?: string; season?: string }
}

export default async function AdminStatsPage({ searchParams }: Props) {
  const [teams, seasons, currentSeason] = await Promise.all([
    getAllTeams(),
    getAllSeasons(),
    getCurrentSeason(),
  ])

  const selectedTeam   = teams.find(t => t.id === searchParams.team) ?? teams[0]
  const selectedSeason = seasons.find(s => s.id === searchParams.season) ?? currentSeason ?? seasons[0]

  const teamStats = selectedTeam && selectedSeason
    ? await getTeamStats(selectedTeam.slug, selectedSeason.id)
    : null

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <h1>Admin — stats entry</h1>
          <p className="subtitle">Add or update player stats per team and season</p>
        </div>
      </header>

      {/* Team + season selectors */}
      <section className="admin-selectors">
        <AdminStatsForm
          teams={teams}
          seasons={seasons}
          selectedTeamId={selectedTeam?.id ?? ''}
          selectedSeasonId={selectedSeason?.id ?? ''}
        />
      </section>

      {/* Current roster table */}
      {teamStats && teamStats.players.length > 0 && (
        <section className="player-table-section">
          <h2>
            {selectedTeam?.name} — {selectedSeason?.name}
            <span className="subtitle" style={{ marginLeft: '0.75rem' }}>
              {teamStats.players.length} players
            </span>
          </h2>
          <AdminRosterTable players={teamStats.players} />
        </section>
      )}

      {teamStats && teamStats.players.length === 0 && (
        <p className="subtitle">No players added yet for this team and season.</p>
      )}
    </main>
  )
}
