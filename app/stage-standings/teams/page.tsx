'use client'

import { useEffect, useMemo, useState } from 'react'
import SiteNav from '@/app/components/SiteNav'
import { supabase } from '@/lib/supabaseClient'

type Row = {
  team_id: string
  name: string | null
  stage_number: number | null
  stage_points_counted: number | null
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
        .select('team_id, name, stage_number, stage_points_counted')
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
    return rows.filter((r) => (r.name ?? '').toLowerCase().includes(needle))
  }, [rows, q])

  return (
    <>
      <SiteNav />
      <main style={{ padding: 24, fontFamily: 'system-ui', background: '#f6f7f9', minHeight: '100vh', color: '#111' }}>
        <h1 style={{ fontSize: 28, fontWeight: 950, marginBottom: 10 }}>Team Stage Standings</h1>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <label style={{ fontWeight: 900, alignSelf: 'center' }}>Stage</label>
          <input
            type="number"
            min={1}
            value={stage}
            onChange={(e) => setStage(Number(e.target.value || 1))}
            style={{ width: 90, padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', background: '#fff' }}
          />

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search team..."
            style={{ width: 320, padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', background: '#fff' }}
          />

          <div style={{ fontWeight: 900, color: '#374151', alignSelf: 'center' }}>
            {filtered.length} rows
          </div>
        </div>

        {error && (
          <div style={{ padding: 12, background: '#fee', border: '1px solid #f99', borderRadius: 12, marginBottom: 12 }}>
            Error: {error}
          </div>
        )}

        {filtered.length === 0 && !error ? (
          <div style={{ opacity: 0.75, fontWeight: 800 }}>No team stage standings yet (preseason).</div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '70px 1fr 160px',
                padding: '12px 14px',
                fontWeight: 950,
                background: '#f3f4f6',
              }}
            >
              <div>Pos</div>
              <div>Team</div>
              <div style={{ textAlign: 'right' }}>Stage Pts</div>
            </div>

            {filtered.map((r, idx) => (
              <div
                key={`${r.team_id}-${idx}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '70px 1fr 160px',
                  padding: '12px 14px',
                  borderTop: '1px solid #eee',
                }}
              >
                <div style={{ fontWeight: 950 }}>{idx + 1}</div>
                <div style={{ fontWeight: 900 }}>{r.name ?? 'Team'}</div>
                <div style={{ textAlign: 'right', fontWeight: 950 }}>
                  {Number(r.stage_points_counted ?? 0)}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  )
}

