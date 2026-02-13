'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import SiteNav from '@/app/components/SiteNav'
import { supabase } from '@/lib/supabaseClient'

type RacePointsRow = {
  race_id: string
  person_id: string
  is_human: boolean | null
  base_points: number | null
  bonus_points: number | null
  penalty_points: number | null
  total_points: number | null
}

type EventRow = { id: string; stage_number: number | null }
type RaceRow = { id: string; event_id: string | null }
type PersonRow = { id: string; display_name: string | null }

type Row = {
  person_id: string
  driver: string | null
  stage_number: number
  base_points: number
  bonus_points: number
  penalty_points: number
  stage_points_counted: number
}

export default function DriverStageStandingsPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [stage, setStage] = useState<number>(1)
  const [q, setQ] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setError(null)
      setLoading(true)

      // 1) Find events in this stage
      const { data: events, error: eErr } = await supabase
        .from('events')
        .select('id, stage_number')
        .eq('stage_number', stage)

      if (cancelled) return
      if (eErr) {
        setError(eErr.message)
        setLoading(false)
        return
      }

      const eventIds = ((events ?? []) as EventRow[]).map((e) => e.id)
      if (eventIds.length === 0) {
        setRows([])
        setLoading(false)
        return
      }

      // 2) Find races tied to those events
      const { data: races, error: rErr } = await supabase
        .from('iracing_races')
        .select('id, event_id')
        .in('event_id', eventIds)

      if (cancelled) return
      if (rErr) {
        setError(rErr.message)
        setLoading(false)
        return
      }

      const raceIds = ((races ?? []) as RaceRow[]).map((r) => r.id)
      if (raceIds.length === 0) {
        setRows([])
        setLoading(false)
        return
      }

      // 3) Pull race points for those races (HUMANS ONLY)
      const { data: pts, error: pErr } = await supabase
        .from('v_iracing_race_points_calc')
        .select('race_id, person_id, is_human, base_points, bonus_points, penalty_points, total_points')
        .in('race_id', raceIds)
        .eq('is_human', true)

      if (cancelled) return
      if (pErr) {
        setError(pErr.message)
        setLoading(false)
        return
      }

      const pointsRows = (pts ?? []) as RacePointsRow[]
      const personIds = Array.from(new Set(pointsRows.map((r) => r.person_id)))

      // 4) Load names
      const { data: people, error: peopleErr } = await supabase
        .from('people')
        .select('id, display_name')
        .in('id', personIds)

      if (cancelled) return
      if (peopleErr) {
        setError(peopleErr.message)
        setLoading(false)
        return
      }

      const nameById = new Map<string, string>(
        ((people ?? []) as PersonRow[]).map((p) => [p.id, p.display_name ?? 'Unknown'])
      )

      // 5) Aggregate by driver for stage totals
      const agg = new Map<string, Row>()

      for (const r of pointsRows) {
        if (r.is_human !== true) continue

        const cur = agg.get(r.person_id) ?? {
          person_id: r.person_id,
          driver: nameById.get(r.person_id) ?? 'Unknown',
          stage_number: stage,
          base_points: 0,
          bonus_points: 0,
          penalty_points: 0,
          stage_points_counted: 0,
        }

        cur.base_points += r.base_points ?? 0
        cur.bonus_points += r.bonus_points ?? 0
        cur.penalty_points += r.penalty_points ?? 0
        cur.stage_points_counted += r.total_points ?? 0

        agg.set(r.person_id, cur)
      }

      const list = Array.from(agg.values()).sort((a, b) => b.stage_points_counted - a.stage_points_counted)

      setRows(list)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
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
            <div className="subtle">Humans only • Base / Bonus / Penalty included</div>
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

        {loading ? (
          <div className="card cardPad">
            <div className="subtle" style={{ fontWeight: 900 }}>Loading stage standings…</div>
          </div>
        ) : filtered.length === 0 && !error ? (
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
                  <th className="th" style={{ textAlign: 'right' }}>Base</th>
                  <th className="th" style={{ textAlign: 'right' }}>Bonus</th>
                  <th className="th" style={{ textAlign: 'right' }}>Pen</th>
                  <th className="th" style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, idx) => (
                  <tr key={`${r.person_id}-${idx}`} className="rowHover">
                    <td className="td" style={{ fontWeight: 950 }}>{idx + 1}</td>
                    <td className="td" style={{ fontWeight: 950 }}>{r.driver ?? 'Driver'}</td>
                    <td className="td" style={{ textAlign: 'right', fontWeight: 900 }}>{r.base_points}</td>
                    <td className="td" style={{ textAlign: 'right', fontWeight: 900 }}>{r.bonus_points}</td>
                    <td className="td" style={{ textAlign: 'right', fontWeight: 900 }}>{r.penalty_points}</td>
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

