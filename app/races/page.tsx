'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import SiteNav from '@/app/components/SiteNav'

type RaceRow = {
  id: string
  name: string | null
  race_number: number | null
  stage_number: number | null
  event_date: string | null
  location: string | null
}

export default function RacesPage() {
  const [rows, setRows] = useState<RaceRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, name, race_number, stage_number, event_date, location')
        .order('race_number', { ascending: true })

      if (error) setError(error.message)
      else setRows((data as any) ?? [])
    }

    load()
  }, [])

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 16 }}>
        Race Schedule & Results
      </h1>

      {error && <div style={{ color: 'red' }}>Error: {error}</div>}

      {rows.map((e) => (
        <div
          key={e.id}
          style={{
            padding: 12,
            border: '1px solid #eee',
            borderRadius: 12,
            marginBottom: 10,
          }}
        >
          <div style={{ fontWeight: 900 }}>
            Race {String(e.race_number ?? 0).padStart(2, '0')}: {e.name ?? 'TBD'}
          </div>

          <div style={{ color: '#666', marginTop: 4 }}>
            Stage {e.stage_number ?? '—'} • {e.location ?? 'TBD'} • {e.event_date ?? 'TBD'}
          </div>

          <div style={{ marginTop: 8 }}>
            <Link href={`/races/${e.id}`}>View results →</Link>
          </div>
        </div>
      ))}
    </main>
  )
}


