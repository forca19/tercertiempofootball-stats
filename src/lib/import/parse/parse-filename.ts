import { basename } from 'path'
import type { ParsedFileMeta } from '../types'

export function parseFilename(filePath: string): ParsedFileMeta {
  const fileName = basename(filePath)
  const stem = fileName.replace(/\.xlsx$/i, '')

  if (stem.startsWith('Lideres - ')) {
    return {
      filePath,
      fileName,
      teamKey: 'Lideres',
      seasonLabel: stem.slice('Lideres - '.length).trim(),
    }
  }

  if (stem.startsWith('Pericos - ')) {
    return {
      filePath,
      fileName,
      teamKey: 'Pericos',
      seasonLabel: stem.slice('Pericos - '.length).trim(),
    }
  }

  if (stem.startsWith('Pericos ')) {
    return {
      filePath,
      fileName,
      teamKey: 'Pericos',
      seasonLabel: stem.slice('Pericos '.length).trim(),
    }
  }

  if (stem.toLowerCase().startsWith('delfinos ')) {
    return {
      filePath,
      fileName,
      teamKey: 'Delfinos',
      seasonLabel: stem.slice('Delfinos '.length).trim(),
    }
  }

  throw new Error(`Cannot parse team/season from filename: ${fileName}`)
}
