'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import SiteNav from '@/app/components/SiteNav'
import { supabase } from '@/lib/supabaseClient'

type Row = {
  person_id: string
  driver: string | null
  stage_number: number | null
  stage_points_counted: number | null
}

export default function DriverStageStandingsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [stage, setStage] = useState<number>(1)
  const [q, setQ] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setError(null)

      // Load stage standings
      const { data, error: e } = await supabase
        .from('v_iracing_stage_standings')
        .select('person_id, driver, stage_number, stage_points_counted')
        .eq('stage_number', stage)
        .order('stage_points_counted', { ascending: false })

      if (e) return setError(e.message)

      setRows((data ?? []) as Row[])
    }

    load()
  }, [stage])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((r) => (r.driver ?? '').toLowerCase().includes(needle))
  }, [rows, q])

  return (
    <>
      <SiteNav />

      <main className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
          <div>
            <h1 className="h1" style={{ marginBottom: 6 }}>Driver Stage Standings</h1>
            <div className="subtle">Stage leaderboard (preseason safe)</div>
          </div>

          <Link
            href="/stage-standings"
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
            ← Back
          </Link>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 14, marginBottom: 12 }}>
          <label className="subtle" style={{ fontWeight: 950, alignSelf: 'center' }}>Stage</label>
          <input
            type="number"
            min={1}
            value={stage}
            onChange={(e) => setStage(Number(e.target.value || 1))}
            style={{
              width: 90,
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.06)',
              color: '#e5e7eb',
              outline: 'none',
              fontWeight: 900,
            }}
          />

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search driver..."
            style={{
              width: 320,
              padding: '10px 12px',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.06)',
              color: '#e5e7eb',
              outline: 'none',
              fontWeight: 900,
            }}
          />

          <div className="subtle" style={{ fontWeight: 950, alignSelf: 'center' }}>
            {filtered.length} rows
          </div>
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

        {filtered.length === 0 && !error ? (
          <div className="card cardPad">
            <div className="subtle" style={{ fontWeight: 900 }}>
              No stage standings yet (preseason).
            </div>
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden', borderRadius: 16 }}>
            <table className="table">
              <thead>
                <tr>
                  <th className="th">Pos</th>
                  <th className="th">Driver</th>
                  <th className="th" style={{ textAlign: 'right' }}>Points</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => (
                  <tr key={`${r.person_id}-${idx}`} className="rowHover">
                    <td className="td" style={{ fontWeight: 950 }}>{idx + 1}</td>
                    <td className="td" style={{ fontWeight: 950 }}>{r.driver ?? 'Driver'}</td>
                    <td className="td" style={{ textAlign: 'right', fontWeight: 950 }}>
                      {Number(r.stage_points_counted ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  )
}
