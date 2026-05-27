import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data, error } = await supabase
    .from('teams')
    .select('*')

  return (
    <main>
      <h1>Tercer Tiempo Football Stats</h1>

      <pre>
        {JSON.stringify({ data, error }, null, 2)}
      </pre>
    </main>
  )
}