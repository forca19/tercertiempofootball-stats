import { readFileSync } from 'fs'
import * as XLSX from 'xlsx'
import type { ParsedFile, RawSheetRow } from '../types'
import type { ParsedFileMeta } from '../types'

function cellToValue(cell: XLSX.CellObject | undefined): string | number | null {
  if (!cell || cell.v === undefined || cell.v === null) return null
  if (typeof cell.v === 'number') return cell.v
  return String(cell.v).trim()
}

export function parseWorkbook(meta: ParsedFileMeta): ParsedFile {
  const buffer = readFileSync(meta.filePath)
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const sheetName = workbook.SheetNames[0]

  if (!sheetName) {
    throw new Error(`No worksheets found in ${meta.fileName}`)
  }

  const sheet = workbook.Sheets[sheetName]
  const grid = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
    raw: true,
  })

  if (!grid.length) {
    throw new Error(`Empty worksheet in ${meta.fileName}`)
  }

  const headerRow = grid[0] ?? []
  const headers = headerRow.map(cell => (cell == null ? '' : String(cell).trim()))

  const rows: RawSheetRow[] = []
  for (const row of grid.slice(1)) {
    if (!row || !row.some(cell => cell != null && String(cell).trim() !== '')) continue

    const record: RawSheetRow = {}
    headers.forEach((header, index) => {
      if (!header) return
      record[header] = cellToValue({ v: row[index] } as XLSX.CellObject)
    })
    rows.push(record)
  }

  return {
    ...meta,
    sheetName,
    headers,
    rows,
  }
}
