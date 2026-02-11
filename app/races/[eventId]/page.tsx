'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import SiteNav from '@/app/components/SiteNav'

type ResultRow = {
  person_id: string | null
  display_name: string
  finish_position: number
  start_position: number | null
  laps_led: number | null
  fastest_lap_time_ms: number | null
  incidents: number | null
  is_ai: boolean
  points: number | null
}

function formatMs(ms: number | null): string {
  if (ms == null) return '—'
  return `${(ms / 1000).toFixed(3)}s`
}

function formatDateMaybe(s: string | null): string {
  if (!s) return 'TBD'
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
  if (m) return m[1]
  return s
}

export default function RaceResultsPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params?.eventId as string

  const [eventName, setEventName] = useState<string>('Race Results')
  const [eventMeta, setEventMeta] = useState<{ location: string | null; event_date: string | null; stage_number?: number | null; race_number?: number | null } | null>(null)
  const [rows, setRows] = useState<ResultRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setError(null)
      setRows([])

      // 1) Event info
      const { data: eventData, error: eventErr } = await supabase
        .from('events')
        .select('id, name, race_number, stage_number, location, event_date')
        .eq('id', eventId)
        .single()

      if (eventErr) {
        setError(eventErr.message)
        return
      }

      setEventMeta({
        location: eventData?.location ?? null,
        event_date: eventData?.event_date ?? null,
        stage_number: eventData?.stage_number ?? null,
        race_number: eventData?.race_number ?? null,
      })

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

      // 3) Raw results (pull person id too so we can link)
      const { data: raw, error: rawErr } = await supabase
        .from('iracing_results_raw')
        .select(
          `
          finish_position,
          start_position,
          laps_led,
          fastest_lap_time_ms,
          incidents,
          people!inner(id, display_name, is_human)
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
        .select('total_points, people!inner(id, display_name)')
        .eq('race_id', raceId)

      const pointsMap = new Map<string, number>()
      ;(pts ?? []).forEach((p: any) => {
        const k = p?.people?.id || p?.people?.display_name
        if (k) pointsMap.set(k, p.total_points)
      })

      const merged: ResultRow[] = (raw ?? []).map((r: any) => {
        const name = r.people?.display_name ?? 'Unknown'
        const pid = r.people?.id ?? null
        const isHuman = r.people?.is_human === true

        return {
          person_id: pid,
          display_name: name,
          finish_position: r.finish_position,
          start_position: r.start_position ?? null,
          laps_led: r.laps_led ?? 0,
          fastest_lap_time_ms: r.fastest_lap_time_ms ?? null,
          incidents: r.incidents ?? 0,
          is_ai: !isHuman,
          points: (pid && pointsMap.has(pid)) ? (pointsMap.get(pid) ?? null) : (pointsMap.get(name) ?? null),
        }
      })

      setRows(merged)
    }

    if (eventId) load()
  }, [eventId])

  const podium = useMemo(() => rows.filter((r) => r.finish_position <= 3).sort((a, b) => a.finish_position - b.finish_position), [rows])

  const highlights = useMemo(() => {
    if (rows.length === 0) return null

    const humans = rows.filter((r) => !r.is_ai)

    const byLaps = [...humans].sort((a, b) => (b.laps_led ?? 0) - (a.laps_led ?? 0))
    const mostLed = byLaps[0] && (byLaps[0].laps_led ?? 0) > 0 ? byLaps[0] : null

    const byFastLap = [...humans]
      .filter((r) => typeof r.fastest_lap_time_ms === 'number')
      .sort((a, b) => (a.fastest_lap_time_ms ?? 9e15) - (b.fastest_lap_time_ms ?? 9e15))
    const fastest = byFastLap[0] ?? null

    const byInc = [...humans].sort((a, b) => (a.incidents ?? 0) - (b.incidents ?? 0))
    const cleanest = byInc[0] ?? null

    return { mostLed, fastest, cleanest }
  }, [rows])

  const goDriver = (r: ResultRow) => {
    if (!r.person_id) return
    router.push(`/drivers/${r.person_id}`)
  }

  return (
    <>
      <SiteNav />

      <main className="container">
        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
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

          {eventMeta && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 950,
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: '1px solid rgba(96,165,250,0.35)',
                  background: 'rgba(96,165,250,0.10)',
                  color: '#e5e7eb',
                }}
              >
                RACE {String(eventMeta.race_number ?? 0).padStart(2, '0')}
              </span>

              <span
                style={{
                  fontSize: 12,
                  fontWeight: 950,
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#e5e7eb',
                }}
              >
                Stage {eventMeta.stage_number ?? '—'}
              </span>

              <span
                style={{
                  fontSize: 12,
                  fontWeight: 950,
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: '1px solid rgba(34,197,94,0.28)',
                  background: 'rgba(34,197,94,0.10)',
                  color: '#e5e7eb',
                }}
              >
                {formatDateMaybe(eventMeta.event_date)}
              </span>

              <span
                style={{
                  fontSize: 12,
                  fontWeight: 950,
                  padding: '6px 10px',
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'rgba(255,255,255,0.06)',
                  color: '#e5e7eb',
                }}
              >
                {eventMeta.location ?? 'TBD'}
              </span>
            </div>
          )}
        </div>

        <h1 className="h1" style={{ marginBottom: 8 }}>
          {eventName}
        </h1>

        {!error && (
          <div className="subtle" style={{ marginBottom: 16 }}>
            Click a driver row to open their profile • Preseason-safe
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

        {/* Podium */}
        {rows.length > 0 && podium.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
              marginBottom: 14,
            }}
          >
            {podium.map((r) => {
              const bg =
                r.finish_position === 1
                  ? 'linear-gradient(180deg, rgba(250,204,21,0.18), rgba(255,255,255,0.06))'
                  : r.finish_position === 2
                  ? 'linear-gradient(180deg, rgba(148,163,184,0.16), rgba(255,255,255,0.06))'
                  : 'linear-gradient(180deg, rgba(244,114,182,0.14), rgba(255,255,255,0.06))'

              const border =
                r.finish_position === 1
                  ? 'rgba(250,204,21,0.35)'
                  : r.finish_position === 2
                  ? 'rgba(148,163,184,0.35)'
                  : 'rgba(244,114,182,0.30)'

              return (
                <div
                  key={`podium-${r.finish_position}-${r.display_name}`}
                  className="card cardPad"
                  role="button"
                  tabIndex={0}
                  onClick={() => goDriver(r)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') goDriver(r)
                  }}
                  style={{
                    cursor: r.person_id ? 'pointer' : 'default',
                    background: bg,
                    borderColor: border,
                  }}
                >
                  <div className="subtle" style={{ fontWeight: 950, letterSpacing: '0.08em' }}>
                    {r.finish_position === 1 ? 'WINNER' : r.finish_position === 2 ? 'P2' : 'P3'}
                  </div>

                  <div style={{ marginTop: 8, fontWeight: 950, fontSize: 18 }}>{r.display_name}</div>

                  <div className="subtle" style={{ marginTop: 6, fontWeight: 950 }}>
                    {r.points != null ? `${r.points} pts` : '— pts'} • Inc {r.incidents ?? 0}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Highlights */}
        {rows.length > 0 && highlights && (
          <div
            className="card"
            style={{
              padding: 14,
              borderRadius: 16,
              marginBottom: 14,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.05))',
              borderColor: 'rgba(255,255,255,0.12)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ fontWeight: 950, letterSpacing: '0.06em' }}>RACE HIGHLIGHTS</div>
              <div className="subtle" style={{ fontWeight: 900 }}>
                Human drivers only
              </div>
            </div>

            <div
              style={{
                marginTop: 12,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 12,
              }}
            >
              <Highlight
                label="Most Laps Led"
                value={highlights.mostLed ? `${highlights.mostLed.display_name} • ${highlights.mostLed.laps_led ?? 0} led` : '—'}
                onClick={highlights.mostLed?.person_id ? () => goDriver(highlights.mostLed!) : undefined}
              />
              <Highlight
                label="Fastest Lap"
                value={highlights.fastest ? `${highlights.fastest.display_name} • ${formatMs(highlights.fastest.fastest_lap_time_ms)}` : '—'}
                onClick={highlights.fastest?.person_id ? () => goDriver(highlights.fastest!) : undefined}
              />
              <Highlight
                label="Cleanest Driver"
                value={highlights.cleanest ? `${highlights.cleanest.display_name} • Inc ${highlights.cleanest.incidents ?? 0}` : '—'}
                onClick={highlights.cleanest?.person_id ? () => goDriver(highlights.cleanest!) : undefined}
              />
            </div>
          </div>
        )}

        {/* Results Table */}
        {rows.length > 0 && (
          <div className="card" style={{ overflow: 'hidden', borderRadius: 16 }}>
            <table className="table">
              <thead>
                <tr>
                  <th className="th">Pos</th>
                  <th className="th">Driver</th>
                  <th className="th">Start</th>
                  <th className="th">Laps Led</th>
                  <th className="th">Fast Lap</th>
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
                      role="button"
                      tabIndex={0}
                      onClick={() => goDriver(r)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') goDriver(r)
                      }}
                      style={{
                        cursor: r.person_id ? 'pointer' : 'default',
                        background: isP1
                          ? 'rgba(250,204,21,0.10)'
                          : isP2
                          ? 'rgba(148,163,184,0.10)'
                          : isP3
                          ? 'rgba(244,114,182,0.08)'
                          : 'transparent',
                      }}
                    >
                      <td className="td" style={{ fontWeight: 950 }}>
                        {r.finish_position}
                      </td>

                      <td className="td" style={{ fontWeight: 950 }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ color: '#e5e7eb' }}>{r.display_name}</span>
                          {r.is_ai && (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 950,
                                padding: '4px 8px',
                                borderRadius: 999,
                                border: '1px solid rgba(255,255,255,0.14)',
                                background: 'rgba(255,255,255,0.06)',
                                color: '#e5e7eb',
                              }}
                            >
                              AI
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="td">{r.start_position ?? '-'}</td>
                      <td className="td">{r.laps_led ?? 0}</td>
                      <td className="td">{formatMs(r.fastest_lap_time_ms)}</td>
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

function Highlight({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) {
  return (
    <div
      className="card"
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return
        if (e.key === 'Enter' || e.key === ' ') onClick()
      }}
      style={{
        padding: 12,
        borderRadius: 14,
        borderColor: 'rgba(255,255,255,0.12)',
        background: 'rgba(255,255,255,0.06)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div className="subtle" style={{ fontWeight: 950, letterSpacing: '0.06em' }}>
        {label.toUpperCase()}
      </div>
      <div style={{ marginTop: 8, fontWeight: 950, color: '#e5e7eb' }}>{value}</div>
    </div>
  )
}



