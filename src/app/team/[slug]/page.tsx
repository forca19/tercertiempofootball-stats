import { supabase } from '@/lib/supabase'

type Props = {
  params: Promise<{
    slug: string
  }>
}

export default async function TeamPage({ params }: Props) {
  const { slug } = await params

  const { data: team, error } = await supabase
    .from('teams')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !team) {
    return <div>Team not found</div>
  }

  return (
    <main className="p-8">
      <h1 className="text-4xl font-bold mb-4">
        {team.name}
      </h1>

      <pre className="bg-gray-100 p-4 rounded">
        {JSON.stringify(team, null, 2)}
      </pre>
    </main>
  )
}