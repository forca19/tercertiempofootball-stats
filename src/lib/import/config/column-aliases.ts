import type { StatField } from '../types'

/** Map spreadsheet header text to canonical stat / player fields. */
const HEADER_ALIASES: Record<string, StatField | 'player_name'> = {
  nombre: 'player_name',
  jugador: 'player_name',
  name: 'player_name',
  player: 'player_name',
  goles: 'goals',
  gol: 'goals',
  goals: 'goals',
  goal: 'goals',
  asistencias: 'assists',
  'asist.': 'assists',
  asist: 'assists',
  assists: 'assists',
  assistencias: 'assists',
  atajadas: 'saves',
  atajada: 'saves',
  saves: 'saves',
  'salvadas en la linea': 'saves',
  'salvadas en la línea': 'saves',
  partidos: 'matches',
  matches: 'matches',
  juegos: 'matches',
  pj: 'matches',
}

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/\.$/, '')
    .replace(/\s+/g, ' ')
}

export function mapHeader(header: string): StatField | 'player_name' | null {
  const key = normalizeHeader(header)
  return HEADER_ALIASES[key] ?? null
}

export type ColumnMapping = {
  playerIndex: number | null
  statIndices: Partial<Record<StatField, number>>
  unmappedHeaders: string[]
}

export function buildColumnMapping(headers: string[]): ColumnMapping {
  const statIndices: Partial<Record<StatField, number>> = {}
  let playerIndex: number | null = null
  const unmappedHeaders: string[] = []

  headers.forEach((header, index) => {
    const mapped = mapHeader(header)
    if (mapped === 'player_name') {
      playerIndex = index
      return
    }
    if (mapped) {
      statIndices[mapped] = index
      return
    }
    if (header.trim()) {
      unmappedHeaders.push(header.trim())
    }
  })

  return { playerIndex, statIndices, unmappedHeaders }
}
