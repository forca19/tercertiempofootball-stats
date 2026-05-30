import type { BlockedMerge, DeterministicPair, PlayerAliasesConfig } from '../types'

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '')
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function stripEmoji(value: string): string {
  return collapseWhitespace(
    value.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}⭐💦]/gu, '')
  )
}

export function normalizeLookupKey(value: string): string {
  return stripAccents(collapseWhitespace(value)).toLowerCase()
}

function buildAliasLookup(config: PlayerAliasesConfig): Map<string, string> {
  const lookup = new Map<string, string>()

  for (const entry of config.players) {
    lookup.set(normalizeLookupKey(entry.canonical), entry.canonical)
    for (const alias of entry.aliases) {
      lookup.set(normalizeLookupKey(alias), entry.canonical)
    }
  }

  return lookup
}

function buildDeterministicLookup(pairs: DeterministicPair[]): Map<string, string> {
  const lookup = new Map<string, string>()
  for (const pair of pairs) {
    lookup.set(normalizeLookupKey(pair.from), pair.to)
  }
  return lookup
}

function buildBlockedMergeIndex(blocked: BlockedMerge[]): Map<string, string> {
  const index = new Map<string, string>()
  for (const group of blocked) {
    for (const name of group.names) {
      index.set(normalizeLookupKey(name), group.id)
    }
  }
  return index
}

export type PlayerNormalizer = {
  normalize: (rawName: string) => { canonical: string; warnings: string[] }
  validateBlockedMerges: (canonicalNames: string[]) => string[]
  validateConfig: () => string[]
}

export function createPlayerNormalizer(config: PlayerAliasesConfig): PlayerNormalizer {
  const aliasLookup = buildAliasLookup(config)
  const deterministicLookup = buildDeterministicLookup(config.auto_normalize.deterministic_pairs)
  const blockedIndex = buildBlockedMergeIndex(config.blocked_merges)

  function resolveCanonical(rawName: string): { canonical: string; warnings: string[] } {
    const warnings: string[] = []
    let name = collapseWhitespace(rawName)
    name = stripEmoji(name)

    const deterministic = deterministicLookup.get(normalizeLookupKey(name))
    if (deterministic) {
      name = deterministic
    }

    const aliasCanonical = aliasLookup.get(normalizeLookupKey(name))
    const canonical = aliasCanonical ?? name

    if (aliasCanonical && aliasCanonical !== rawName) {
      warnings.push(`Alias: "${rawName}" → "${canonical}"`)
    } else if (deterministic && deterministic !== rawName) {
      warnings.push(`Normalized: "${rawName}" → "${canonical}"`)
    }

    return { canonical, warnings }
  }

  function validateConfig(): string[] {
    const errors: string[] = []

    for (const group of config.blocked_merges) {
      const canonicalKeys = new Map<string, string>()

      for (const name of group.names) {
        const { canonical } = resolveCanonical(name)
        const rawKey = normalizeLookupKey(name)
        const canonKey = normalizeLookupKey(canonical)

        for (const [otherRawKey, otherCanonical] of canonicalKeys) {
          if (rawKey === otherRawKey) continue
          if (canonKey === normalizeLookupKey(otherCanonical)) {
            errors.push(
              `blocked_merges "${group.id}" collapses "${name}" and "${otherCanonical}" to the same canonical player via aliases`
            )
          }
        }

        canonicalKeys.set(rawKey, canonical)
      }
    }

    return errors
  }

  function validateBlockedMerges(_canonicalNames: string[]): string[] {
    // Coexistence of distinct blocked-group players across the import batch is expected.
    // Wrongful merges are caught per file in validateFileBlockedMerges.
    return []
  }

  return {
    normalize: resolveCanonical,
    validateBlockedMerges,
    validateConfig,
  }
}

/** Fail import if two raw names in the same file resolve to the same canonical within a blocked group. */
export function validateFileBlockedMerges(
  config: PlayerAliasesConfig,
  pairs: Array<{ raw: string; canonical: string }>
): string[] {
  const errors: string[] = []
  const blockedIndex = buildBlockedMergeIndex(config.blocked_merges)

  for (const group of config.blocked_merges) {
    const canonicalByKey = new Map<string, string>()

    for (const { raw, canonical } of pairs) {
      const groupId = blockedIndex.get(normalizeLookupKey(raw))
      if (groupId !== group.id) continue

      const key = normalizeLookupKey(canonical)
      const existing = canonicalByKey.get(key)
      if (existing && existing !== canonical) {
        errors.push(`File merges blocked group "${group.id}" to multiple canonicals: ${existing}, ${canonical}`)
      }
      canonicalByKey.set(key, canonical)
    }

    const distinctCanonicals = new Set(
      pairs
        .filter(({ raw }) => blockedIndex.get(normalizeLookupKey(raw)) === group.id)
        .map(({ canonical }) => normalizeLookupKey(canonical))
    )

    if (distinctCanonicals.size > 1 && distinctCanonicals.size < group.names.length) {
      // multiple blocked names present and correctly distinct — OK
    }
  }

  // Detect wrongful collapse: two different raw names from same blocked group -> same canonical
  for (const group of config.blocked_merges) {
    const rawInGroup = pairs.filter(({ raw }) =>
      group.names.some(name => normalizeLookupKey(name) === normalizeLookupKey(raw))
    )
    const canonicalKeys = new Set(rawInGroup.map(({ canonical }) => normalizeLookupKey(canonical)))
    if (rawInGroup.length >= 2 && canonicalKeys.size === 1) {
      errors.push(
        `File incorrectly merges blocked group "${group.id}" to one player: ${rawInGroup.map(r => r.raw).join(', ')} → ${rawInGroup[0].canonical}`
      )
    }
  }

  return errors
}
