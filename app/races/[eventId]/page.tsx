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

      // 3) Raw results (assumes iracing_results_raw has person_id FK to people)
      // NOTE: We derive AI/Human from people.is_human (AI = NOT is_human)
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

      // 4) Points (if computed). If none yet, points show as '-'
      const { data: pts, error: ptsErr } = await supabase
        .from('iracing_points_awarded')
        .select('total_points, people!inner(display_name)')
        .eq('race_id', raceId)

      // points not existing yet is fine, but real errors we’ll show
      if (ptsErr) {
        // don’t hard-fail; just show '-' for points
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
    <main style={{ padding: 24, fontFamily: 'system-ui' }}>
      <div style={{ marginBottom: 12 }}>
        <Link href="/races">← Back to races</Link>
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>{eventName}</h1>

      {error && (
        <div style={{ padding: 12, background: '#fee', border: '1px solid #f99', marginBottom: 12 }}>
          Error: {error}
        </div>
      )}

      {!error && rows.length === 0 && (
        <p style={{ color: '#666' }}>
          No results posted for this race yet (or no race session created for this event).
        </p>
      )}

      {rows.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left' }}>
              <th style={{ borderBottom: '1px solid #ddd', padding: 8 }}>Pos</th>
              <th style={{ borderBottom: '1px solid #ddd', padding: 8 }}>Driver</th>
              <th style={{ borderBottom: '1px solid #ddd', padding: 8 }}>AI?</th>
              <th style={{ borderBottom: '1px solid #ddd', padding: 8 }}>Start</th>
              <th style={{ borderBottom: '1px solid #ddd', padding: 8 }}>Laps Led</th>
              <th style={{ borderBottom: '1px solid #ddd', padding: 8 }}>Inc</th>
              <th style={{ borderBottom: '1px solid #ddd', padding: 8 }}>Points</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.display_name}-${i}`}>
                <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8 }}>{r.finish_position}</td>
                <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8 }}>{r.display_name}</td>
                <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8 }}>{r.is_ai ? 'Yes' : 'No'}</td>
                <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8 }}>{r.start_position ?? '-'}</td>
                <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8 }}>{r.laps_led ?? 0}</td>
                <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8 }}>{r.incidents ?? 0}</td>
                <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8 }}>{r.points ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}

