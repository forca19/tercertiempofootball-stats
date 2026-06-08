'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { PlayerStatRow } from '@/lib/supabase'

interface Props {
  players: PlayerStatRow[]
}


export default function AdminRosterTable({ players }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [removing, setRemoving] = useState<string | null>(null)

  const [editedPlayers, setEditedPlayers] = useState(players)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setEditedPlayers(players)
  }, [players])

  const hasChanges =
  JSON.stringify(players) !==
  JSON.stringify(editedPlayers)

  const modifiedPlayers = editedPlayers.filter((edited) => {
    const original = players.find(
      p => p.roster_id === edited.roster_id
    )

    if (!original) return false

    return (
      original.goals !== edited.goals ||
      original.assists !== edited.assists ||
      original.matches !== edited.matches
    )
  })

  function updateStat(
    rosterId: string,
    field: 'matches' | 'goals' | 'assists',
    value: number
  ) {
    setEditedPlayers(current =>
      current.map(player =>
        player.roster_id === rosterId
          ? { ...player, [field]: value }
          : player
      )
    )
  }

  async function handleSaveChanges() {
    const updates = modifiedPlayers.map(player => ({
      roster_id: player.roster_id,
      goals: player.goals,
      assists: player.assists,
      matches: player.matches,
    }))

    await fetch('/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'bulk_update_stats',
        updates,
      }),
    })

    startTransition(() => router.refresh())
  }

  async function handleRemove(rosterId: string, name: string) {
    if (!confirm(`Remove ${name} from this team's roster?`)) return
    setRemoving(rosterId)
    try {
      await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_roster', rosterId }),
      })
      startTransition(() => router.refresh())
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="table-wrapper">
      <div className="mb-4 flex items-center gap-3">
        <button
          disabled={!hasChanges || saving}
          onClick={handleSaveChanges}
          className="btn-primary"
        >
          Save Changes ({modifiedPlayers.length})
        </button>

        {hasChanges && (
          <span className="text-sm">
            {modifiedPlayers.length} players modified
          </span>
        )}
      </div>
      <table className="player-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Player</th>
            <th>Pos</th>
            <th>Matches</th>
            <th>Goals</th>
            <th>Assists</th>
            <th>G+A</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {editedPlayers.map(p => { 
            const isModified = modifiedPlayers.some(
              m => m.roster_id === p.roster_id
            )            
            return (
            <tr key={p.roster_id} style={{ opacity: removing === p.roster_id ? 0.4 : 1, transition: 'opacity 0.2s' }}>
              <td className="muted">{p.number ?? '—'}</td>
              <td className="player-name">{p.player_name}</td>
              <td className="muted">{p.position ?? '—'}</td>
              <td>
                <input
                  type="number"
                  min={0}
                  value={p.matches}
                  onChange={(e) =>
                    updateStat(
                      p.roster_id,
                      'matches',
                      Number(e.target.value)
                    )
                  }
                  className="player-stat-input"
                />
              </td>
              <td>
                <input
                  type="number"
                  min={0}
                  value={p.goals}
                  onChange={(e) =>
                    updateStat(
                      p.roster_id,
                      'goals',
                      Number(e.target.value)
                    )
                  }
                  className="player-stat-input"
                />
              </td>
              <td>
                <input
                  type="number"
                  min={0}
                  value={p.assists}
                  onChange={(e) =>
                    updateStat(
                      p.roster_id,
                      'assists',
                      Number(e.target.value)
                    )
                  }
                  className="player-stat-input"
                />
              </td>
              <td className="stat-total">{p.goals + p.assists}</td>
              <td>
                <button
                  className="btn-remove"
                  onClick={() => handleRemove(p.roster_id, p.player_name)}
                  disabled={removing === p.roster_id}
                  title="Remove from roster"
                >
                  ✕
                </button>
              </td>
            </tr>
          ) }
          
          )}
        </tbody>
      </table>
    </div>
  )
}
