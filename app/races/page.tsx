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
    <>
      <SiteNav />

      <main className="container">
        <h1 className="h1">Race Schedule & Results</h1>
        <div className="subtle" style={{ marginBottom: 16 }}>
          Schedule, locations, and results links. (Preseason safe)
        </div>

        {error && (
          <div
            className="card cardPad"
            style={{
              borderColor: 'rgba(239,68,68,0.35)',
              background: 'rgba(239,68,68,0.10)',
              marginBottom: 12,
            }}
          >
            <b>Error:</b> {error}
          </div>
        )}

        {rows.length === 0 && !error ? (
          <div className="subtle" style={{ fontWeight: 900 }}>
            No events yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {rows.map((e) => (
              <div key={e.id} className="card cardPad">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontWeight: 950, fontSize: 16 }}>
                    Race {String(e.race_number ?? 0).padStart(2, '0')}: {e.name ?? 'TBD'}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 950,
                      padding: '6px 10px',
                      borderRadius: 999,
                      border: '1px solid rgba(96,165,250,0.35)',
                      background: 'rgba(96,165,250,0.10)',
                      color: '#e5e7eb',
                    }}
                  >
                    Stage {e.stage_number ?? '—'}
                  </div>
                </div>

                <div className="subtle" style={{ marginTop: 8 }}>
                  {e.location ?? 'TBD'} • {e.event_date ?? 'TBD'}
                </div>

                <div style={{ marginTop: 12 }}>
                  <Link
                    href={`/races/${e.id}`}
                    style={{
                      textDecoration: 'none',
                      fontWeight: 950,
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid rgba(255,255,255,0.14)',
                      background: 'rgba(255,255,255,0.06)',
                      display: 'inline-block',
                      color: '#e5e7eb',
                    }}
                  >
                    View results →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  )
}



