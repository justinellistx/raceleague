'use client'

import { useEffect, useMemo, useState } from 'react'
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

function formatDateMaybe(s: string | null): string {
  if (!s) return 'TBD'
  // If it's already pretty, just show it
  // If it’s ISO-ish, take YYYY-MM-DD
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
  if (m) return m[1]
  return s
}

export default function RacesPage() {
  const [rows, setRows] = useState<RaceRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setError(null)

      const { data, error } = await supabase
        .from('events')
        .select('id, name, race_number, stage_number, event_date, location')
        .order('race_number', { ascending: true })

      if (error) setError(error.message)
      else setRows((data as any) ?? [])
    }

    load()
  }, [])

  const hasAny = rows.length > 0

  const groupedByStage = useMemo(() => {
    // optional: stage grouping without changing your data
    const map = new Map<string, RaceRow[]>()
    for (const r of rows) {
      const key = `Stage ${r.stage_number ?? '—'}`
      map.set(key, [...(map.get(key) ?? []), r])
    }
    return map
  }, [rows])

  return (
    <>
      <SiteNav />

      <main className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
          <div>
            <h1 className="h1" style={{ marginBottom: 6 }}>
              Race Schedule & Results
            </h1>
            <div className="subtle">Broadcast rundown • Click any race to view results (preseason safe)</div>
          </div>

          <div
            className="card"
            style={{
              padding: '10px 12px',
              borderRadius: 14,
              display: 'flex',
              gap: 10,
              alignItems: 'center',
              background: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.06))',
            }}
          >
            <span className="subtle" style={{ fontWeight: 950 }}>
              Events
            </span>
            <span style={{ fontWeight: 950 }}>{rows.length}</span>
          </div>
        </div>

        {error && (
          <div
            className="card cardPad"
            style={{
              borderColor: 'rgba(239,68,68,0.35)',
              background: 'rgba(239,68,68,0.10)',
              marginTop: 14,
            }}
          >
            <b>Error:</b> {error}
          </div>
        )}

        {!hasAny && !error ? (
          <div className="card cardPad" style={{ marginTop: 14 }}>
            <div className="subtle" style={{ fontWeight: 900 }}>
              No events yet.
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 14, display: 'grid', gap: 14 }}>
            {[...groupedByStage.entries()].map(([stageLabel, stageRaces]) => (
              <div key={stageLabel} className="card cardPad" style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                  <div style={{ fontWeight: 950, letterSpacing: '0.06em' }}>{stageLabel.toUpperCase()}</div>

                  <div className="subtle" style={{ fontWeight: 950 }}>
                    {stageRaces.length} races
                  </div>
                </div>

                <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                  {stageRaces.map((e) => {
                    const raceNum = String(e.race_number ?? 0).padStart(2, '0')
                    const dateText = formatDateMaybe(e.event_date)

                    return (
                      <div
                        key={e.id}
                        className="card"
                        style={{
                          padding: 14,
                          borderRadius: 16,
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.05))',
                          borderColor: 'rgba(255,255,255,0.12)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span
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
                              RACE {raceNum}
                            </span>

                            <div style={{ fontWeight: 950, fontSize: 16 }}>
                              {e.name ?? 'TBD'}
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 950,
                                padding: '6px 10px',
                                borderRadius: 999,
                                border: '1px solid rgba(34,197,94,0.28)',
                                background: 'rgba(34,197,94,0.10)',
                                color: '#e5e7eb',
                              }}
                            >
                              {dateText}
                            </span>

                            <span
                              style={{
                                fontSize: 12,
                                fontWeight: 950,
                                padding: '6px 10px',
                                borderRadius: 999,
                                border: '1px solid rgba(255,255,255,0.14)',
                                background: 'rgba(255,255,255,0.06)',
                                color: '#e5e7eb',
                              }}
                            >
                              {e.location ?? 'TBD'}
                            </span>
                          </div>
                        </div>

                        <div className="subtle" style={{ marginTop: 10 }}>
                          Results link stays live even in preseason — page will show “No results yet.”
                        </div>

                        <div style={{ marginTop: 12 }}>
                          <Link
                            href={`/races/${e.id}`}
                            style={{
                              textDecoration: 'none',
                              fontWeight: 950,
                              padding: '10px 12px',
                              borderRadius: 12,
                              border: '1px solid rgba(255,255,255,0.16)',
                              background: 'rgba(255,255,255,0.06)',
                              display: 'inline-block',
                              color: '#e5e7eb',
                            }}
                          >
                            View results →
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  )
}




