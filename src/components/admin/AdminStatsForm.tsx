'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import type { Team, Season } from '@/lib/supabase'

interface Props {
  teams: Team[]
  seasons: Season[]
  selectedTeamId: string
  selectedSeasonId: string
}

type CareerHit = { team_name: string; season_name: string; goals: number; assists: number; matches: number }

export default function AdminStatsForm({ teams, seasons, selectedTeamId, selectedSeasonId }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useSearchParams()
  const [, startTransition] = useTransition()

  function navigate(teamId: string, seasonId: string) {
    const p = new URLSearchParams(params.toString())
    p.set('team', teamId); p.set('season', seasonId)
    startTransition(() => router.push(`${pathname}?${p}`))
  }

  const selectedTeam = teams.find(t => t.id === selectedTeamId)

  // Logo URL save
  const [logoUrl, setLogoUrl]     = useState(selectedTeam?.logo_url ?? '')
  const [logoStatus, setLogoStatus] = useState<'idle'|'saving'|'saved'|'error'>('idle')

  useEffect(() => {
    setLogoUrl(teams.find(t => t.id === selectedTeamId)?.logo_url ?? '')
    setLogoStatus('idle')
  }, [selectedTeamId, teams])

  async function saveLogo() {
    if (!logoUrl.trim()) return
    setLogoStatus('saving')
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upsert_team_logo', teamId: selectedTeamId, logoUrl: logoUrl.trim() }),
      })
      if (!res.ok) throw new Error()
      setLogoStatus('saved')
      startTransition(() => router.refresh())
      setTimeout(() => setLogoStatus('idle'), 3000)
    } catch {
      setLogoStatus('error')
    }
  }

  // Player name search with career lookup
  const [playerName, setPlayerName] = useState('')
  const [career, setCareer]         = useState<CareerHit[]>([])
  const [loadingCareer, setLoadingCareer] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (playerName.trim().length < 2) { setCareer([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoadingCareer(true)
      try {
        const res = await fetch(`/api/admin/player-career?name=${encodeURIComponent(playerName)}`)
        const data = await res.json()
        setCareer(data.career ?? [])
      } finally {
        setLoadingCareer(false)
      }
    }, 350)
  }, [playerName])

  const [number,   setNumber]   = useState('')
  const [position, setPosition] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [goals,    setGoals]    = useState('')
  const [assists,  setAssists]  = useState('')
  const [matches,  setMatches]  = useState('')

  const [status, setStatus] = useState<'idle'|'loading'|'success'|'error'>('idle')
  const [msg, setMsg]       = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!playerName.trim()) return
    setStatus('loading')
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_stats',
          playerName: playerName.trim(),
          number:   number   ? parseInt(number)   : null,
          position: position || null,
          photoUrl: photoUrl || null,
          teamId:   selectedTeamId,
          seasonId: selectedSeasonId,
          goals:    parseInt(goals)   || 0,
          assists:  parseInt(assists) || 0,
          matches:  parseInt(matches) || 0,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStatus('success')
      setMsg(`Saved stats for ${data.player.name}`)
      setPlayerName(''); setNumber(''); setPosition(''); setPhotoUrl('')
      setGoals(''); setAssists(''); setMatches(''); setCareer([])
      startTransition(() => router.refresh())
      setTimeout(() => setStatus('idle'), 3000)
    } catch (err: any) {
      setStatus('error')
      setMsg(err.message ?? 'Something went wrong')
    }
  }

  const otherTeams = career.filter(c => c.team_name !== selectedTeam?.name)

  return (
    <div className="admin-card">
      {/* Team + season selectors */}
      <div className="field-row">
        <div className="field">
          <label>Team</label>
          <select
            value={selectedTeamId}
            onChange={e => {
              const p = new URLSearchParams(params.toString())
              p.set('team', e.target.value)
              p.delete('season')
              startTransition(() => router.push(`${pathname}?${p}`))
            }}
          >
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Season</label>
          <select value={selectedSeasonId} onChange={e => navigate(selectedTeamId, e.target.value)}>
            {seasons.map(s => (
              <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' (current)' : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Team logo URL */}
      <div className="field" style={{ marginTop: '0.75rem' }}>
        <label>Team logo URL</label>
        <div className="input-with-action">
          {logoUrl && (
            <img
              src={logoUrl}
              alt="logo preview"
              className="logo-preview"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
          <input
            type="url"
            placeholder="https://example.com/logo.png"
            value={logoUrl}
            onChange={e => { setLogoUrl(e.target.value); setLogoStatus('idle') }}
          />
          <button type="button" className="btn-secondary" onClick={saveLogo} disabled={logoStatus === 'saving'}>
            {logoStatus === 'saving' ? 'Saving…' : logoStatus === 'saved' ? 'Saved!' : 'Save logo'}
          </button>
        </div>
      </div>

      <hr className="divider" />

      <form onSubmit={handleSubmit}>
        <h3 className="form-section-title">Player</h3>

        <div className="field" style={{ position: 'relative' }}>
          <label>Player name *</label>
          <input
            type="text"
            placeholder="e.g. Carlos Mendez"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
            required
            autoComplete="off"
          />
          {loadingCareer && <span className="field-hint">Searching...</span>}
        </div>

        {otherTeams.length > 0 && (
          <div className="career-warning">
            <span className="warning-icon">!</span>
            <div>
              <strong>Player found on other teams</strong>
              <ul className="career-list">
                {otherTeams.map((c, i) => (
                  <li key={i}>
                    {c.team_name} — {c.season_name}:
                    <span className="stat-pill">{c.goals}G</span>
                    <span className="stat-pill">{c.assists}A</span>
                    <span className="stat-pill">{c.matches} matches</span>
                  </li>
                ))}
              </ul>
              <p className="career-note">Stats are tracked per team per season — the player profile will be shared.</p>
            </div>
          </div>
        )}

        <div className="field-row" style={{ marginTop: '0.5rem' }}>
          <div className="field">
            <label>Number</label>
            <input type="number" placeholder="9" value={number} onChange={e => setNumber(e.target.value)} min={1} max={99} />
          </div>
          <div className="field">
            <label>Position</label>
            <select value={position} onChange={e => setPosition(e.target.value)}>
              <option value="">—</option>
              <option>GK</option><option>DEF</option><option>MID</option><option>FWD</option>
            </select>
          </div>
        </div>

        <div className="field" style={{ marginTop: '0.5rem' }}>
          <label>Player photo URL</label>
          <div className="input-with-action">
            {photoUrl && (
              <img
                src={photoUrl}
                alt="photo preview"
                className="logo-preview"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}
            <input
              type="url"
              placeholder="https://example.com/player.jpg"
              value={photoUrl}
              onChange={e => setPhotoUrl(e.target.value)}
            />
          </div>
        </div>

        <h3 className="form-section-title" style={{ marginTop: '1.25rem' }}>Stats</h3>
        <div className="field-row three-col">
          <div className="field">
            <label>Goals</label>
            <input type="number" placeholder="0" value={goals} onChange={e => setGoals(e.target.value)} min={0} />
          </div>
          <div className="field">
            <label>Assists</label>
            <input type="number" placeholder="0" value={assists} onChange={e => setAssists(e.target.value)} min={0} />
          </div>
          <div className="field">
            <label>Matches</label>
            <input type="number" placeholder="0" value={matches} onChange={e => setMatches(e.target.value)} min={0} />
          </div>
        </div>

        <div className="form-footer">
          <button type="submit" className="btn-primary" disabled={status === 'loading'}>
            {status === 'loading' ? 'Saving…' : 'Save player stats'}
          </button>
          {status === 'success' && <span className="feedback success">{msg}</span>}
          {status === 'error'   && <span className="feedback error">{msg}</span>}
        </div>
      </form>
    </div>
  )
}
