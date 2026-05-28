'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { PlayerStatRow } from '@/lib/supabase'

interface Props {
  players: PlayerStatRow[]
}

export default function AdminRosterTable({ players }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [removing, setRemoving] = useState<string | null>(null)

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
          {players.map(p => (
            <tr key={p.roster_id} style={{ opacity: removing === p.roster_id ? 0.4 : 1, transition: 'opacity 0.2s' }}>
              <td className="muted">{p.number ?? '—'}</td>
              <td className="player-name">{p.player_name}</td>
              <td className="muted">{p.position ?? '—'}</td>
              <td>{p.matches}</td>
              <td className="stat-goals">{p.goals}</td>
              <td className="stat-assists">{p.assists}</td>
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
          ))}
        </tbody>
      </table>
    </div>
  )
}
