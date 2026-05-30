import TeamStatsContent from '@/components/stats/TeamStatsContent'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ season?: string }>
}

export default async function TeamPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { season: seasonIdFromQuery } = await searchParams

  return <TeamStatsContent teamSlug={slug} seasonIdFromQuery={seasonIdFromQuery} />
}
