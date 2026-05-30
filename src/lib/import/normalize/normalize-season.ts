const TOURNAMENT_WORDS: Record<string, string> = {
  apertura: 'Apertura',
  clausura: 'Clausura',
  'primavera-verano': 'Primavera-Verano',
  'otoño-invierno': 'Otoño-Invierno',
  'otono-invierno': 'Otoño-Invierno',
}

function titleCaseWord(word: string): string {
  if (!word) return word
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

function expandTwoDigitYear(token: string): string {
  if (!/^\d{2}$/.test(token)) return token
  const year = parseInt(token, 10)
  return String(2000 + year)
}

/** Normalize season label from filename to DB seasons.name format. */
export function normalizeSeasonName(seasonLabel: string): string {
  const trimmed = seasonLabel.trim().replace(/\s+/g, ' ')
  const lower = trimmed.toLowerCase()

  for (const [key, canonical] of Object.entries(TOURNAMENT_WORDS)) {
    if (lower.startsWith(key)) {
      const rest = trimmed.slice(key.length).trim()
      if (!rest) return canonical

      // Range year: 2025-2026
      if (/^\d{4}-\d{4}$/.test(rest)) {
        return `${canonical} ${rest}`
      }

      // Single year: 2023 or 24
      const parts = rest.split(/\s+/)
      const normalizedParts = parts.map(part => {
        if (/^\d{4}$/.test(part)) return part
        if (/^\d{2}$/.test(part)) return expandTwoDigitYear(part)
        return titleCaseWord(part)
      })

      return `${canonical} ${normalizedParts.join(' ')}`.trim()
    }
  }

  // Fallback: title-case tokens, expand 2-digit years
  return trimmed
    .split(/\s+/)
    .map(token => (/^\d{2}$/.test(token) ? expandTwoDigitYear(token) : titleCaseWord(token)))
    .join(' ')
}
