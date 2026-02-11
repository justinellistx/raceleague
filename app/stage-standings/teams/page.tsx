'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import SiteNav from '@/app/components/SiteNav'
import { supabase } from '@/lib/supabaseClient'

type Row = {
  team_id: string
  team: string | null
  stage_number: number | null
  team_stage_points: number | string | null
}

function toNumber(v: any): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export default function TeamStageStandingsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [stage, setStage] = useState<number>(1)
  const [q, setQ] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setError(null)

      const { data, error: e } = await supabase
        .from('v_iracing_team_stage_standings')
        .select('team_id, team, stage_number, team_stage_points')
        .eq('stage_number', stage)
        .order('team_stage_points', { ascending: false })

      if (e) return setError(e.message)
      setRows((data ?? []) as Row[])
    }

    load()
  }, [stage])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((r) => (r.team ?? '').toLowerCase().includes(needle))
  }, [rows, q])

  return (
    <>
      <SiteNav />

      <main className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
          <div>
            <h1 className="h1" style={{ marginBottom: 6 }}>Team Stage Standings</h1>
            <div className="subtle">Team points by stage (preseason safe)</div>
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
            className="input"
            style={{ width: 90, fontWeight: 900 }}
          />

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search team..."
            className="input"
            style={{ width: 320, fontWeight: 900 }}
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
              No team stage standings yet (preseason).
            </div>
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr>
                  <th className="th">Pos</th>
                  <th className="th">Team</th>
                  <th className="th" style={{ textAlign: 'right' }}>Points</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => (
                  <tr key={`${r.team_id}-${idx}`} className="rowHover">
                    <td className="td" style={{ fontWeight: 950 }}>{idx + 1}</td>
                    <td className="td" style={{ fontWeight: 950 }}>
                      {r.team ? (
                        <Link href={`/teams/${r.team_id}`} style={{ fontWeight: 950, textDecoration: 'none' }}>
                          {r.team}
                        </Link>
                      ) : (
                        'Team'
                      )}
                    </td>
                    <td className="td" style={{ textAlign: 'right', fontWeight: 950 }}>
                      {toNumber(r.team_stage_points)}
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


