#!/usr/bin/env node
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { runImport } from '../src/lib/import'

function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return
  for (const line of readFileSync(filePath, 'utf-8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvFile(resolve(process.cwd(), '.env.local'))

function parseArgs(argv: string[]) {
  const write = argv.includes('--write')
  const strict = argv.includes('--strict')
  const reportIndex = argv.indexOf('--report')
  const fileIndex = argv.indexOf('--file')

  return {
    write,
    strict,
    reportPath: reportIndex >= 0 ? argv[reportIndex + 1] : undefined,
    fileFilter: fileIndex >= 0 ? argv[fileIndex + 1] : undefined,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  try {
    const report = await runImport({
      write: args.write,
      strict: args.strict,
      reportPath: args.reportPath,
      fileFilter: args.fileFilter,
    })

    if (report.errors.length > 0) {
      process.exitCode = 1
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exitCode = 1
  }
}

main()
