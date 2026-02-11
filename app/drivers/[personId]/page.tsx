'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import SiteNav from '@/app/components/SiteNav'
import Avatar from '@/app/components/Avatar'

type Person = {
  id: string
  display_name: string | null
  is_human: boolean | null
}

type Team = { id: string; name: string | null }

type StandingsRow = {
  person_id: string
  season_points_counted: number | null
}

type ResultRow = {
  race_id: string
  finish_position: number | null
  start_position: number | null
  laps_led: number | null
  fastest_lap_time_ms: number | null
  incidents: number | null
  status: string | null
  created_at: string | null
}

type DriverStageRow = {
  season_id: string
  stage_number: number | null
  person_id: string
  driver: string | null
  stage_points_counted: number | null
}

export default function DriverProfilePage() {
  const params = useParams()
  const rawPersonId = params?.personId as string | undefined

  // Safety: prevent ".jpg" or ".png" ever reaching Supabase UUID query
  const personId = (rawPersonId ?? '').replace(/\.jpg$|\.png$/i, '')

  const [person, setPerson] = useState<Person | null>(null)
  const [teamName, setTeamName] = useState<string | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)

  const [seasonRank, setSeasonRank] = useState<number | null>(null)
  const [seasonPoints, setSeasonPoints] = useState<number | null>(null)

  const [results, setResults] = useState<ResultRow[]>([])
  const [stageRows, setStageRows] = useState<DriverStageRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setError(null)

      if (!personId || personId === 'undefined') {
        setError('Invalid driver link (missing id). Go back and click a driver again.')
        return
      }

      // Person
      const { data: p, error: pErr } = await supabase
        .from('people')
        .select('id, display_name, is_human')
        .eq('id', personId)
        .maybeSingle()

      if (cancelled) return
      if (pErr) return setError(pErr.message)
      if (!p) return setError('Driver not found.')
      setPerson(p as Person)

      // Team (optional)
      const { data: tm, error: tmErr } = await supabase
        .from('team_members')
        .select('team_id, person_id')
        .eq('person_id', personId)
        .maybeSingle()

      if (cancelled) return
      if (tmErr) return setError(tmErr.message)

      if (tm?.team_id) {
        setTeamId(tm.team_id)

        const { data: t, error: tErr } = await supabase
          .from('teams')
          .select('id, name')
          .eq('id', tm.team_id)
          .maybeSingle()

        if (cancelled) return
        if (tErr) return setError(tErr.message)
        setTeamName((t as Team | null)?.name ?? null)
      } else {
        setTeamId(null)
        setTeamName(null)
      }

      // Season standing (empty preseason => view may be empty)
      const { data: standings, error: sErr } = await supabase
        .from('v_iracing_season_standings')
        .select('person_id, season_points_counted')

      if (cancelled) return
      if (sErr) {
        // treat as preseason/optional
        setSeasonRank(null)
        setSeasonPoints(null)
      } else {
        const srows = (standings ?? []) as StandingsRow[]
        if (srows.length > 0) {
          const sorted = [...srows].sort(
            (a, b) => (b.season_points_counted ?? 0) - (a.season_points_counted ?? 0)
          )
          const idx = sorted.findIndex((r) => r.person_id === personId)
          if (idx >= 0) {
            setSeasonRank(idx + 1)
            setSeasonPoints(sorted[idx].season_points_counted ?? 0)
          } else {
            setSeasonRank(null)
            setSeasonPoints(null)
          }
        } else {
          setSeasonRank(null)
          setSeasonPoints(null)
        }
      }

      // Driver stage standings
      const { data: st, error: stErr } = await supabase
        .from('v_iracing_stage_standings')
        .select('season_id, stage_number, person_id, driver, stage_points_counted')
        .eq('person_id', personId)
        .order('stage_number', { ascending: true })

      if (cancelled) return
      if (stErr) setStageRows([])
      else setStageRows((st ?? []) as DriverStageRow[])

      // Recent results
      const { data: rr, error: rErr } = await supabase
        .from('iracing_results_raw')
        .select('race_id, finish_position, start_position, laps_led, fastest_lap_time_ms, incidents, status, created_at')
        .eq('person_id', personId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (cancelled) return
      if (rErr) return setError(rErr.message)
      setResults((rr ?? []) as ResultRow[])
    }

    load()
    return () => {
      cancelled = true
    }
  }, [personId])

  const stats = useMemo(() => {
    const startPositions = results.map((x) => x.start_position).filter((v): v is number => typeof v === 'number')
    const finishPositions = results.map((x) => x.finish_position).filter((v): v is number => typeof v === 'number')
    const incidents = results.map((x) => x.incidents).filter((v): v is number => typeof v === 'number')
    const lapsLed = results.map((x) => x.laps_led).filter((v): v is number => typeof v === 'number')
    const fastLaps = results.map((x) => x.fastest_lap_time_ms).filter((v): v is number => typeof v === 'number')

    const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null)
    const min = (arr: number[]) => (arr.length ? Math.min(...arr) : null)

    return {
      starts: results.length,
      avgStart: avg(startPositions),
      avgFinish: avg(finishPositions),
      bestFinish: min(finishPositions),
      totalLapsLed: lapsLed.length ? lapsLed.reduce((a, b) => a + b, 0) : 0,
      bestLapMs: min(fastLaps),
      avgIncidents: avg(incidents),
    }
  }, [results])

  const formatMs = (ms: number | null) => (ms == null ? '—' : `${(ms / 1000).toFixed(3)}s`)

  const stageSummary = useMemo(() => {
    const list = (stageRows ?? [])
      .filter((r) => typeof r.stage_number === 'number')
      .map((r) => ({
        stageNumber: r.stage_number as number,
        points: r.stage_points_counted ?? 0,
      }))
      .sort((a, b) => a.stageNumber - b.stageNumber)

    const total = list.reduce((sum, x) => sum + (x.points ?? 0), 0)
    return { list, total }
  }, [stageRows])

  const driverName = person?.display_name ?? 'Unknown'
  const fallbackLetter = (driverName?.[0] ?? '?').toUpperCase()

  return (
    <main
      style={{
        padding: 24,
        fontFamily: 'system-ui',
        color: '#111',
        background: '#f6f7f9',
        minHeight: '100vh',
      }}
    >
      <SiteNav />

      <Link href="/drivers" style={{ textDecoration: 'none', color: '#111', fontWeight: 900 }}>
        ← Back to Drivers
      </Link>

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            background: '#fee',
            border: '1px solid #f99',
            borderRadius: 12,
            color: '#111',
          }}
        >
          Error: {error}
        </div>
      )}

      {person && (
        <>
          <div
            style={{
              marginTop: 14,
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
             <Avatar
  srcJpg={`/driver-photos/${personId}.jpg`}
  srcPng={`/driver-photos/${personId}.png`}
  alt={driverName}
  size={110}
  fallbackText={fallbackLetter}
/>


              <div>
                <h1 style={{ margin: 0, fontSize: 32, fontWeight: 950 }}>{driverName}</h1>

                <div style={{ marginTop: 6, color: '#333' }}>
                  Team:{' '}
                  {teamId ? (
                    <Link
                      href={`/teams/${teamId}`}
                      style={{ color: '#111', fontWeight: 900, textDecoration: 'underline' }}
                    >
                      {teamName ?? 'Team'}
                    </Link>
                  ) : (
                    <b style={{ color: '#111' }}>{teamName ?? '—'}</b>
                  )}
                </div>
              </div>
            </div>

            <div
              style={{
                fontSize: 12,
                fontWeight: 900,
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid #ccc',
                background: '#dff5e7',
                color: '#111',
              }}
            >
              HUMAN
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
            }}
          >
            <StatCard
              label="Season Standing"
              value={seasonRank ? `P${seasonRank}` : '—'}
              sub={`Points: ${seasonPoints ?? '—'}`}
            />
            <StatCard label="Starts" value={`${stats.starts}`} />
            <StatCard label="Average Start" value={stats.avgStart != null ? stats.avgStart.toFixed(1) : '—'} />
            <StatCard label="Average Finish" value={stats.avgFinish != null ? stats.avgFinish.toFixed(1) : '—'} />
            <StatCard label="Best Finish" value={stats.bestFinish != null ? `P${stats.bestFinish}` : '—'} />
            <StatCard label="Total Laps Led" value={`${stats.totalLapsLed}`} />
            <StatCard label="Best Lap" value={formatMs(stats.bestLapMs)} />
            <StatCard label="Avg Incidents" value={stats.avgIncidents != null ? stats.avgIncidents.toFixed(1) : '—'} />
          </div>

          {/* Stage Standings */}
          <div
            style={{
              marginTop: 18,
              border: '1px solid #d7d7d7',
              borderRadius: 14,
              padding: 14,
              background: '#fff',
              boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
            }}
          >
            <h2 style={{ margin: 0, marginBottom: 10, fontSize: 16, fontWeight: 950 }}>
              Stage Standings
            </h2>

            {stageSummary.list.length === 0 ? (
              <div style={{ color: '#333', fontWeight: 800 }}>
                No stage points yet (preseason or no scored stages).
              </div>
            ) : (
              <>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left' }}>
                      <th style={{ borderBottom: '1px solid #ddd', padding: 8, color: '#111' }}>Stage</th>
                      <th style={{ borderBottom: '1px solid #ddd', padding: 8, color: '#111' }}>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stageSummary.list.map((s) => (
                      <tr key={`stage-${s.stageNumber}`}>
                        <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8, color: '#111' }}>
                          Stage {s.stageNumber}
                        </td>
                        <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8, color: '#111' }}>
                          {s.points ?? 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ marginTop: 10, color: '#333', fontWeight: 900 }}>
                  Total stage points: <span style={{ color: '#111' }}>{stageSummary.total}</span>
                </div>
              </>
            )}
          </div>

          {/* Recent Results */}
          <div
            style={{
              marginTop: 18,
              border: '1px solid #d7d7d7',
              borderRadius: 14,
              padding: 14,
              background: '#fff',
              boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
            }}
          >
            <h2 style={{ margin: 0, marginBottom: 10, fontSize: 16, fontWeight: 950 }}>
              Recent Results
            </h2>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left' }}>
                  <th style={{ borderBottom: '1px solid #ddd', padding: 8, color: '#111' }}>Race</th>
                  <th style={{ borderBottom: '1px solid #ddd', padding: 8, color: '#111' }}>Start</th>
                  <th style={{ borderBottom: '1px solid #ddd', padding: 8, color: '#111' }}>Finish</th>
                  <th style={{ borderBottom: '1px solid #ddd', padding: 8, color: '#111' }}>Laps Led</th>
                  <th style={{ borderBottom: '1px solid #ddd', padding: 8, color: '#111' }}>Fastest Lap</th>
                  <th style={{ borderBottom: '1px solid #ddd', padding: 8, color: '#111' }}>Inc</th>
                  <th style={{ borderBottom: '1px solid #ddd', padding: 8, color: '#111' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={`${r.race_id}-${i}`}>
                    <td
                      style={{
                        borderBottom: '1px solid #f0f0f0',
                        padding: 8,
                        color: '#111',
                        fontFamily: 'monospace',
                        fontSize: 12,
                      }}
                    >
                      {r.race_id.slice(0, 8)}…
                    </td>
                    <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8, color: '#111' }}>
                      {r.start_position ?? '—'}
                    </td>
                    <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8, color: '#111' }}>
                      {r.finish_position != null ? `P${r.finish_position}` : '—'}
                    </td>
                    <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8, color: '#111' }}>
                      {r.laps_led ?? 0}
                    </td>
                    <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8, color: '#111' }}>
                      {r.fastest_lap_time_ms != null ? `${(r.fastest_lap_time_ms / 1000).toFixed(3)}s` : '—'}
                    </td>
                    <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8, color: '#111' }}>
                      {r.incidents ?? 0}
                    </td>
                    <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8, color: '#111' }}>
                      {r.status ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {results.length === 0 && (
              <div style={{ marginTop: 10, color: '#333', fontWeight: 800 }}>
                No results yet for this driver.
              </div>
            )}
          </div>
        </>
      )}
    </main>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      style={{
        border: '1px solid #d7d7d7',
        borderRadius: 14,
        padding: 14,
        background: '#fff',
        color: '#111',
        boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
      }}
    >
      <div style={{ fontSize: 12, color: '#444', fontWeight: 800 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 950, marginTop: 6, color: '#111' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#333', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}






