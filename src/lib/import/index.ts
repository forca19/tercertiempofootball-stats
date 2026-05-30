import { loadImportConfig } from './config/load-config'
import { buildImportPlan } from './plan/build-import-plan'
import {
  defaultReportPath,
  formatDryRunSummary,
  writeAuditReport,
} from './report/dry-run-summary'
import type { ImportOptions, ImportReport } from './types'

export async function runImport(options: ImportOptions = {}): Promise<ImportReport> {
  const config = loadImportConfig(options.importsDir)
  const plan = buildImportPlan(config, options)

  const reportPath = options.reportPath ?? defaultReportPath(plan.mode)
  let report = writeAuditReport(plan, reportPath)

  console.log(formatDryRunSummary(plan))

  if (options.write) {
    if (plan.errors.length > 0) {
      throw new Error(`Import aborted: ${plan.errors.length} validation error(s)`)
    }

    const { persistImportPlan } = await import('./write/persist')
    const writeResult = await persistImportPlan(plan)
    report.writeResult = writeResult
    report = writeAuditReport(report, reportPath)

    console.log('')
    console.log('Write complete:')
    console.log(`  teams created:   ${writeResult.teamsCreated}`)
    console.log(`  seasons created: ${writeResult.seasonsCreated}`)
    console.log(`  players created: ${writeResult.playersCreated}`)
    console.log(`  rosters created: ${writeResult.rostersCreated}`)
    console.log(`  stats upserted:  ${writeResult.statsUpserted}`)
  }

  console.log('')
  console.log(`Audit report: ${reportPath}`)

  return report
}

export type { ImportOptions, ImportReport, ImportPlan } from './types'
