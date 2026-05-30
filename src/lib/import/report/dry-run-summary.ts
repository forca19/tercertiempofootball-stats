import { mkdirSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import type { ImportPlan, ImportReport } from '../types'

export function formatDryRunSummary(plan: ImportPlan): string {
  const lines: string[] = []
  lines.push(`Import ${plan.mode} — ${plan.startedAt}`)
  lines.push('─'.repeat(48))
  lines.push(`Files scanned:      ${plan.filesScanned}`)
  lines.push(`Rows parsed:        ${plan.rows.length}`)
  lines.push(`Errors:             ${plan.errors.length}`)
  lines.push(`Warnings:           ${plan.warnings.length}`)
  lines.push(`Blocked merges OK:  ${plan.blockedMergesOk ? 'yes' : 'no'}`)
  lines.push('')
  lines.push('Planned operations:')
  lines.push(`  teams:    ${plan.operations.filter(o => o.kind === 'ensure_team').length}`)
  lines.push(`  seasons:  ${plan.operations.filter(o => o.kind === 'ensure_season').length}`)
  lines.push(`  players:  ${plan.operations.filter(o => o.kind === 'ensure_player').length}`)
  lines.push(`  roster:   ${plan.operations.filter(o => o.kind === 'ensure_roster').length}`)
  lines.push(`  stats:    ${plan.operations.filter(o => o.kind === 'upsert_stats').length}`)
  lines.push('')
  lines.push('Stat totals (all rows):')
  lines.push(
    `  goals: ${plan.statTotals.goals}  assists: ${plan.statTotals.assists}  saves: ${plan.statTotals.saves}  matches: ${plan.statTotals.matches}`
  )
  lines.push('')
  lines.push('Per file:')

  for (const result of plan.fileResults) {
    const status = result.skipped ? 'SKIP' : 'OK'
    const season = result.rows[0]?.seasonName ?? result.file.seasonLabel
    lines.push(
      `  [${status}] ${result.file.fileName} → ${result.file.teamKey} / ${season} (${result.rows.length} rows)`
    )
  }

  if (plan.warnings.length) {
    lines.push('')
    lines.push('Warnings:')
    for (const warning of plan.warnings.slice(0, 20)) {
      lines.push(`  - ${warning}`)
    }
    if (plan.warnings.length > 20) {
      lines.push(`  … and ${plan.warnings.length - 20} more`)
    }
  }

  if (plan.errors.length) {
    lines.push('')
    lines.push('Errors:')
    for (const error of plan.errors) {
      lines.push(`  - ${error}`)
    }
  }

  return lines.join('\n')
}

export function writeAuditReport(plan: ImportPlan, reportPath: string): ImportReport {
  const finishedAt = new Date().toISOString()
  const report: ImportReport = { ...plan, finishedAt, reportPath }

  mkdirSync(dirname(reportPath), { recursive: true })
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8')

  return report
}

export function defaultReportPath(mode: 'dry-run' | 'write'): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `reports/import-${mode}-${stamp}.json`
}
