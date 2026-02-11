'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import SiteNav from '@/app/components/SiteNav'

type StandingRow = {
  person_id: string | null
  display_name: string | null
  season_points_counted: number | null
}

export default function StandingsPage() {
  const [rows, setRows] = useState<StandingRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const { data, error } = await supabase
        .from('v_iracing_season_standings')
        .select('person_id, display_name, season_points_counted')
        .order('season_points_counted', { ascending: false })

      if (cancelled) return

      if (error) setError(error.message)
      else {
        setError(null)
        setRows((data ?? []) as StandingRow[])
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main
      style={{
        padding: 24,
        fontFamily: 'system-ui',
        color: '#111',
        background: '#f6f7f9',
        minHeight: '100vh',
      }}
    >
      <SiteNav />

      <h1 style={{ fontSize: 28, fontWeight: 950, marginBottom: 16 }}>
        Championship Standings
      </h1>

      {error && (
        <div
          style={{
            padding: 12,
            background: '#fee',
            border: '1px solid #f99',
            borderRadius: 12,
            marginBottom: 12,
            color: '#111',
          }}
        >
          Error: {error}
        </div>
      )}

      <div
        style={{
          border: '1px solid #d7d7d7',
          borderRadius: 14,
          background: '#fff',
          boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th style={{ borderBottom: '1px solid #eee', padding: 10, color: '#444', fontWeight: 900 }}>Pos</th>
              <th style={{ borderBottom: '1px solid #eee', padding: 10, color: '#444', fontWeight: 900 }}>Driver</th>
              <th style={{ borderBottom: '1px solid #eee', padding: 10, color: '#444', fontWeight: 900 }}>Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.person_id ?? `${r.display_name ?? 'driver'}-${i}`}>
                <td style={{ borderBottom: '1px solid #f3f3f3', padding: 10, fontWeight: 900 }}>{i + 1}</td>
                <td style={{ borderBottom: '1px solid #f3f3f3', padding: 10, fontWeight: 800 }}>
                  {r.display_name ?? 'Unknown'}
                </td>
                <td style={{ borderBottom: '1px solid #f3f3f3', padding: 10, fontWeight: 900 }}>
                  {r.season_points_counted ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!error && rows.length === 0 && (
          <div style={{ padding: 12, color: '#444', fontWeight: 800 }}>
            No standings yet (no scored races in the active season).
          </div>
        )}
      </div>
    </main>
  )
}


