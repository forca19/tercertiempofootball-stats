import TeamStatsContent from '@/components/stats/TeamStatsContent'

interface Props {
  params: Promise<{ team: string }>
  searchParams: Promise<{ season?: string }>
}

export default async function TeamStatsPage({ params, searchParams }: Props) {
  const { team: teamSlug } = await params
  const { season: seasonIdFromQuery } = await searchParams

  return <TeamStatsContent teamSlug={teamSlug} seasonIdFromQuery={seasonIdFromQuery} />
}
