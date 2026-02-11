'use client'

import { useEffect, useMemo, useState } from 'react'
import SiteNav from '@/app/components/SiteNav'
import { supabase } from '@/lib/supabaseClient'

type StandingRow = {
  person_id: string
  driver: string | null
  season_points_counted: number | null
}

export default function StandingsPage() {
  const [rows, setRows] = useState<StandingRow[]>([])
  const [q, setQ] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setError(null)

      const { data, error: e } = await supabase
        .from('v_iracing_season_standings')
        .select('person_id, driver, season_points_counted')
        .order('season_points_counted', { ascending: false })

      if (e) {
        setError(e.message)
        return
      }

      setRows((data ?? []) as StandingRow[])
    }

    load()
  }, [])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((r) => (r.driver ?? '').toLowerCase().includes(needle))
  }, [rows, q])

  return (
    <>
      <SiteNav />
      <main
        style={{
          padding: 24,
          fontFamily: 'system-ui',
          color: '#111',
          background: '#f6f7f9',
          minHeight: '100vh',
        }}
      >
        <h1 style={{ fontSize: 28, fontWeight: 950, marginBottom: 10 }}>Standings</h1>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search driver..."
            style={{
              width: 320,
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid #ddd',
              outline: 'none',
              color: '#111',
              background: '#fff',
            }}
          />
          <div style={{ color: '#333', fontWeight: 800, alignSelf: 'center' }}>
            {filtered.length} drivers
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: 12,
              background: '#fee',
              border: '1px solid #f99',
              borderRadius: 12,
              color: '#111',
              marginBottom: 12,
            }}
          >
            Error: {error}
          </div>
        )}

        {filtered.length === 0 && !error ? (
          <div style={{ opacity: 0.75, fontWeight: 700 }}>No standings yet (preseason).</div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e5e5', overflow: 'hidden' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '70px 1fr 140px',
                padding: '12px 14px',
                fontWeight: 900,
                background: '#f3f4f6',
                color: '#111',
              }}
            >
              <div>Pos</div>
              <div>Driver</div>
              <div style={{ textAlign: 'right' }}>Points</div>
            </div>

            {filtered.map((r, idx) => (
              <div
                key={r.person_id ?? `${idx}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '70px 1fr 140px',
                  padding: '12px 14px',
                  borderTop: '1px solid #eee',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontWeight: 900 }}>{idx + 1}</div>
                <div style={{ fontWeight: 900 }}>{r.driver ?? 'Driver'}</div>
                <div style={{ textAlign: 'right', fontWeight: 900 }}>
                  {Number(r.season_points_counted ?? 0)}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  )
}



