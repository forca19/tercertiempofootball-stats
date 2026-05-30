'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import type { Season } from '@/lib/supabase'

interface Props {
  seasons: Season[]
  currentSeasonId: string
}

export default function SeasonSelector({ seasons, currentSeasonId }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const p = new URLSearchParams(searchParams.toString())
    p.set('season', e.target.value)
    router.push(`${pathname}?${p}`)
  }

  return (
    <div className="season-selector">
      <label htmlFor="season-select">Temporada</label>
      <select id="season-select" value={currentSeasonId} onChange={handleChange}>
        {seasons.map(s => (
          <option key={s.id} value={s.id}>
            {s.name}{s.is_current ? ' (actual)' : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
