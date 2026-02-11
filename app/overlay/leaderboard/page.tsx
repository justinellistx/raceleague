'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Row = { pos: number; driver: string; inc: number; pts: number | null }

export default function OverlayLeaderboard() {
  const [title, setTitle] = useState('LIVE LEADERBOARD')
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setError(null)

    const { data: bs, error: bsErr } = await supabase
  .from("broadcast_state")
  .select("active_event_id")
  .limit(1)
  .maybeSingle();


    if (bsErr) return setError(bsErr.message)
    if (!bs?.active_event_id) {
      setTitle('NO LIVE RACE')
      setRows([])
      return
    }

    const eventId = bs.active_event_id as string

    const { data: race } = await supabase
      .from('iracing_races')
      .select('id')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!race?.id) {
      setRows([])
      return
    }

    const raceId = race.id as string

    const { data: raw, error: rawErr } = await supabase
      .from('iracing_results_raw')
      .select('finish_position, incidents, people!inner(display_name)')
      .eq('race_id', raceId)
      .order('finish_position', { ascending: true })

    if (rawErr) return setError(rawErr.message)

    const { data: pts } = await supabase
      .from('iracing_points_awarded')
      .select('total_points, people!inner(display_name)')
      .eq('race_id', raceId)

    const pointsMap = new Map<string, number>()
    ;(pts ?? []).forEach((p: any) => pointsMap.set(p.people.display_name, p.total_points))

    setRows(
      (raw ?? []).slice(0, 15).map((r: any) => ({
        pos: r.finish_position,
        driver: r.people.display_name,
        inc: r.incidents ?? 0,
        pts: pointsMap.get(r.people.display_name) ?? null,
      }))
    )
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 3000)
    return () => clearInterval(t)
  }, [])

  return (
    <main style={{ padding: 24, background: 'transparent', fontFamily: 'system-ui' }}>
      <div style={{ width: 520, borderRadius: 16, padding: 16, background: 'rgba(10,10,12,0.92)', color: '#fff' }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
        {error && <div style={{ color: '#ff9b9b' }}>Error: {error}</div>}
        {rows.length === 0 && !error && <div style={{ opacity: 0.7 }}>Waiting for race data…</div>}
        {rows.map((r) => (
          <div key={`${r.pos}-${r.driver}`} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 60px 70px', gap: 8, padding: '6px 0' }}>
            <div style={{ fontWeight: 900 }}>{r.pos}</div>
            <div style={{ fontWeight: 800 }}>{r.driver}</div>
            <div style={{ textAlign: 'right' }}>{r.inc}</div>
            <div style={{ textAlign: 'right', fontWeight: 900 }}>{r.pts ?? '—'}</div>
          </div>
        ))}
      </div>
    </main>
  )
}

