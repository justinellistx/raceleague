'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Row = {
  pos: number
  team: string
  pts: number
}

export default function OverlayTeamStandings() {
  const [title, setTitle] = useState('TEAM STANDINGS')
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setError(null)
    setTitle('TEAM STANDINGS')

    const { data, error: e } = await supabase
      .from('v_iracing_team_season_standings')
      .select('team_id, team, team_season_points')

    if (e) return setError(e.message)

    const sorted = (data ?? [])
      .map((r: any) => ({
        team: r.team ?? 'Team',
        pts: Number(r.team_season_points ?? 0) || 0,
      }))
      .sort((a: any, b: any) => b.pts - a.pts)
      .slice(0, 15)
      .map((r: any, i: number) => ({ pos: i + 1, team: r.team, pts: r.pts }))

    setRows(sorted)
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 6000)
    return () => clearInterval(t)
  }, [])

  return (
    <main style={{ padding: 24, background: 'transparent', fontFamily: 'system-ui' }}>
      <div style={{ width: 520, borderRadius: 16, padding: 16, background: 'rgba(10,10,12,0.92)', color: '#fff' }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
        {error && <div style={{ color: '#ff9b9b' }}>Error: {error}</div>}
        {rows.length === 0 && !error && <div style={{ opacity: 0.7 }}>Waiting for team standings…</div>}

        {rows.map((r) => (
          <div
            key={`${r.pos}-${r.team}`}
            style={{
              display: 'grid',
              gridTemplateColumns: '50px 1fr 90px',
              gap: 8,
              padding: '6px 0',
            }}
          >
            <div style={{ fontWeight: 900 }}>{r.pos}</div>
            <div style={{ fontWeight: 800 }}>{r.team}</div>
            <div style={{ textAlign: 'right', fontWeight: 900 }}>{r.pts}</div>
          </div>
        ))}
      </div>
    </main>
  )
}
