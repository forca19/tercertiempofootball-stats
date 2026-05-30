import { readdirSync } from 'fs'
import { join } from 'path'

export function discoverWorkbooks(importsDir: string, fileFilter?: string): string[] {
  const files = readdirSync(importsDir)
    .filter(name => name.toLowerCase().endsWith('.xlsx'))
    .sort()

  if (fileFilter) {
    return files
      .filter(name => name.includes(fileFilter) || join(importsDir, name).includes(fileFilter))
      .map(name => join(importsDir, name))
  }

  return files.map(name => join(importsDir, name))
}
