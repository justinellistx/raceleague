'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Row = { pos: number; driver: string; pts: number }

export default function OverlayStageStandingsDrivers() {
  const searchParams = useSearchParams()
  const stage = Number(searchParams.get('stage') || '1')

  const [title, setTitle] = useState(`STAGE ${stage} STANDINGS`)
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setError(null)
    setTitle(`STAGE ${stage} STANDINGS`)

    // humans
    const { data: humans, error: hErr } = await supabase
      .from('people')
      .select('id')
      .eq('is_human', true)

    if (hErr) return setError(hErr.message)
    const humanIds = new Set((humans ?? []).map((r: any) => r.id))

    const { data, error: e } = await supabase
      .from('v_iracing_stage_standings')
      .select('person_id, driver, stage_number, stage_points_counted')
      .eq('stage_number', stage)

    if (e) return setError(e.message)

    const sorted = (data ?? [])
      .filter((r: any) => humanIds.has(r.person_id))
      .map((r: any) => ({
        driver: r.driver ?? 'Driver',
        pts: Number(r.stage_points_counted ?? 0) || 0,
      }))
      .sort((a: any, b: any) => b.pts - a.pts)
      .slice(0, 15)
      .map((r: any, i: number) => ({ pos: i + 1, driver: r.driver, pts: r.pts }))

    setRows(sorted)
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 6000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])

  return (
    <main style={{ padding: 24, background: 'transparent', fontFamily: 'system-ui' }}>
      <div style={{ width: 520, borderRadius: 16, padding: 16, background: 'rgba(10,10,12,0.92)', color: '#fff' }}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>{title}</div>
        {error && <div style={{ color: '#ff9b9b' }}>Error: {error}</div>}
        {rows.length === 0 && !error && <div style={{ opacity: 0.7 }}>Waiting for stage standings…</div>}

        {rows.map((r) => (
          <div key={`${r.pos}-${r.driver}`} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 90px', gap: 8, padding: '6px 0' }}>
            <div style={{ fontWeight: 900 }}>{r.pos}</div>
            <div style={{ fontWeight: 800 }}>{r.driver}</div>
            <div style={{ textAlign: 'right', fontWeight: 900 }}>{r.pts}</div>
          </div>
        ))}
      </div>
    </main>
  )
}
