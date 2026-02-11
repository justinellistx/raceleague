'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import SiteNav from '@/app/components/SiteNav'

type ResultRow = {
  display_name: string
  finish_position: number
  start_position: number | null
  laps_led: number | null
  fastest_lap_time_ms: number | null
  incidents: number | null
  is_ai: boolean
  points: number | null
}

export default function RaceResultsPage() {
  const params = useParams()
  const eventId = params?.eventId as string

  const [eventName, setEventName] = useState<string>('Race Results')
  const [rows, setRows] = useState<ResultRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setError(null)
      setRows([])

      // 1) Event info
      const { data: eventData, error: eventErr } = await supabase
        .from('events')
        .select('id, name, race_number, location, event_date')
        .eq('id', eventId)
        .single()

      if (eventErr) {
        setError(eventErr.message)
        return
      }

      setEventName(
        `Race ${String(eventData?.race_number ?? 0).padStart(2, '0')}: ${eventData?.name ?? 'TBD'}`
      )

      // 2) Find most recent race session for this event
      const { data: raceData, error: raceErr } = await supabase
        .from('iracing_races')
        .select('id')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (raceErr) {
        setError(raceErr.message)
        return
      }

      if (!raceData?.id) {
        // No race session created yet for this event
        return
      }

      const raceId = raceData.id as string

      // 3) Raw results
      const { data: raw, error: rawErr } = await supabase
        .from('iracing_results_raw')
        .select(
          `
          finish_position,
          start_position,
          laps_led,
          fastest_lap_time_ms,
          incidents,
          people!inner(display_name, is_human)
        `
        )
        .eq('race_id', raceId)
        .order('finish_position', { ascending: true })

      if (rawErr) {
        setError(rawErr.message)
        return
      }

      // 4) Points (optional)
      const { data: pts, error: ptsErr } = await supabase
        .from('iracing_points_awarded')
        .select('total_points, people!inner(display_name)')
        .eq('race_id', raceId)

      // points not existing yet is fine
      if (ptsErr) {
        // ignore and show '-' below
      }

      const pointsMap = new Map<string, number>()
      ;(pts ?? []).forEach((p: any) => {
        pointsMap.set(p.people.display_name, p.total_points)
      })

      const merged: ResultRow[] = (raw ?? []).map((r: any) => {
        const name = r.people?.display_name ?? 'Unknown'
        const isHuman = r.people?.is_human === true
        return {
          display_name: name,
          finish_position: r.finish_position,
          start_position: r.start_position ?? null,
          laps_led: r.laps_led ?? 0,
          fastest_lap_time_ms: r.fastest_lap_time_ms ?? null,
          incidents: r.incidents ?? 0,
          is_ai: !isHuman,
          points: pointsMap.get(name) ?? null,
        }
      })

      setRows(merged)
    }

    if (eventId) load()
  }, [eventId])

  return (
    <>
      <SiteNav />

      <main className="container">
        <div style={{ marginBottom: 12 }}>
          <Link
            href="/races"
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
            ← Back to races
          </Link>
        </div>

        <h1 className="h1" style={{ marginBottom: 8 }}>
          {eventName}
        </h1>

        {!error && (
          <div className="subtle" style={{ marginBottom: 16 }}>
            Results update automatically when a race session + raw results exist.
          </div>
        )}

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

        {!error && rows.length === 0 && (
          <div className="card cardPad">
            <div className="subtle" style={{ fontWeight: 900 }}>
              No results posted for this race yet (or no race session created for this event).
            </div>
          </div>
        )}

        {rows.length > 0 && (
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="table">
              <thead>
                <tr>
                  <th className="th">Pos</th>
                  <th className="th">Driver</th>
                  <th className="th">AI?</th>
                  <th className="th">Start</th>
                  <th className="th">Laps Led</th>
                  <th className="th">Inc</th>
                  <th className="th" style={{ textAlign: 'right' }}>
                    Points
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const isP1 = r.finish_position === 1
                  const isP2 = r.finish_position === 2
                  const isP3 = r.finish_position === 3

                  return (
                    <tr
                      key={`${r.display_name}-${i}`}
                      className="rowHover"
                      style={{
                        background: isP1
                          ? 'rgba(34,197,94,0.10)'
                          : isP2
                          ? 'rgba(96,165,250,0.10)'
                          : isP3
                          ? 'rgba(239,68,68,0.08)'
                          : 'transparent',
                      }}
                    >
                      <td className="td" style={{ fontWeight: 950 }}>
                        {r.finish_position}
                      </td>
                      <td className="td" style={{ fontWeight: 900 }}>
                        {r.display_name}
                      </td>
                      <td className="td">{r.is_ai ? 'Yes' : 'No'}</td>
                      <td className="td">{r.start_position ?? '-'}</td>
                      <td className="td">{r.laps_led ?? 0}</td>
                      <td className="td">{r.incidents ?? 0}</td>
                      <td className="td" style={{ textAlign: 'right', fontWeight: 950 }}>
                        {r.points ?? '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  )
}


