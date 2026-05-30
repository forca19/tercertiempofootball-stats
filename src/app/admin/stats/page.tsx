import {
  getAllTeams,
  getSeasonsForTeam,
  getTeamStats,
  resolveSeasonForTeam,
} from '@/lib/supabase'
import AdminStatsForm from '@/components/admin/AdminStatsForm'
import AdminRosterTable from '@/components/admin/AdminRosterTable'

interface Props {
  searchParams: Promise<{ team?: string; season?: string }>
}

export default async function AdminStatsPage({ searchParams }: Props) {
  const { team: teamIdFromQuery, season: seasonIdFromQuery } = await searchParams

  const teams = await getAllTeams()
  const selectedTeam = teams.find(t => t.id === teamIdFromQuery) ?? teams[0]

  const seasons = selectedTeam ? await getSeasonsForTeam(selectedTeam.id) : []
  const selectedSeason = selectedTeam
    ? resolveSeasonForTeam(seasons, seasonIdFromQuery)
    : undefined

  const teamStats =
    selectedTeam && selectedSeason
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

      <section className="admin-selectors">
        <AdminStatsForm
          teams={teams}
          seasons={seasons}
          selectedTeamId={selectedTeam?.id ?? ''}
          selectedSeasonId={selectedSeason?.id ?? ''}
        />
      </section>

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
