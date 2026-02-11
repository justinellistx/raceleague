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

  return (
    <>
      <SiteNav />

      <main className="container">
        <Link
          href="/drivers"
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
          ← Back to Drivers
        </Link>

        {error && (
          <div
            className="card cardPad"
            style={{
              marginTop: 12,
              borderColor: 'rgba(239,68,68,0.35)',
              background: 'rgba(239,68,68,0.10)',
            }}
          >
            <b>Error:</b> {error}
          </div>
        )}

        {person && (
          <>
            {/* Header / Driver ID */}
            <div
              className="card"
              style={{
                marginTop: 16,
                padding: 18,
                borderRadius: 20,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              {/* left side: avatar + name */}
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                <Avatar personId={personId} displayName={driverName} size={110} priority />

                <div>
                  <div className="subtle" style={{ fontWeight: 950, letterSpacing: '0.08em' }}>
                    DRIVER PROFILE
                  </div>

                  <h1 className="h1" style={{ marginTop: 6, marginBottom: 6 }}>
                    {driverName}
                  </h1>

                  <div className="subtle">
                    Team:{' '}
                    {teamId ? (
                      <Link
                        href={`/teams/${teamId}`}
                        style={{
                          color: '#e5e7eb',
                          fontWeight: 950,
                          textDecoration: 'none',
                          borderBottom: '1px solid rgba(96,165,250,0.45)',
                        }}
                      >
                        {teamName ?? 'Team'}
                      </Link>
                    ) : (
                      <span style={{ fontWeight: 950, color: '#e5e7eb' }}>{teamName ?? '—'}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* right side: chips */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 950,
                    padding: '6px 10px',
                    borderRadius: 999,
                    border: '1px solid rgba(34,197,94,0.35)',
                    background: 'rgba(34,197,94,0.10)',
                    color: '#e5e7eb',
                    letterSpacing: '0.06em',
                  }}
                >
                  HUMAN
                </span>

                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 950,
                    padding: '6px 10px',
                    borderRadius: 999,
                    border: '1px solid rgba(96,165,250,0.35)',
                    background: 'rgba(96,165,250,0.10)',
                    color: '#e5e7eb',
                    letterSpacing: '0.06em',
                  }}
                >
                  {seasonRank ? `SEASON P${seasonRank}` : 'SEASON —'}
                </span>
              </div>
            </div>

            {/* Stat grid */}
            <div
              style={{
                marginTop: 14,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
              }}
            >
              <StatCard label="Season Standing" value={seasonRank ? `P${seasonRank}` : '—'} sub={`Points: ${seasonPoints ?? '—'}`} />
              <StatCard label="Starts" value={`${stats.starts}`} />
              <StatCard label="Average Start" value={stats.avgStart != null ? stats.avgStart.toFixed(1) : '—'} />
              <StatCard label="Average Finish" value={stats.avgFinish != null ? stats.avgFinish.toFixed(1) : '—'} />
              <StatCard label="Best Finish" value={stats.bestFinish != null ? `P${stats.bestFinish}` : '—'} />
              <StatCard label="Total Laps Led" value={`${stats.totalLapsLed}`} />
              <StatCard label="Best Lap" value={formatMs(stats.bestLapMs)} />
              <StatCard label="Avg Incidents" value={stats.avgIncidents != null ? stats.avgIncidents.toFixed(1) : '—'} />
            </div>

            {/* Stage Standings */}
            <div className="card cardPad" style={{ marginTop: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'baseline' }}>
                <h2 style={{ margin: 0, fontSize: 14, fontWeight: 950, letterSpacing: '0.02em' }}>Stage Standings</h2>
                <div className="subtle" style={{ fontWeight: 950 }}>
                  Total: {stageSummary.total}
                </div>
              </div>

              {stageSummary.list.length === 0 ? (
                <div className="subtle" style={{ marginTop: 10, fontWeight: 900 }}>
                  No stage points yet (preseason or no scored stages).
                </div>
              ) : (
                <div className="card" style={{ overflow: 'hidden', borderRadius: 14, marginTop: 12 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="th">Stage</th>
                        <th className="th" style={{ textAlign: 'right' }}>
                          Points
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stageSummary.list.map((s) => (
                        <tr key={`stage-${s.stageNumber}`} className="rowHover">
                          <td className="td" style={{ fontWeight: 900 }}>
                            Stage {s.stageNumber}
                          </td>
                          <td className="td" style={{ textAlign: 'right', fontWeight: 950 }}>
                            {s.points ?? 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Recent Results */}
            <div className="card cardPad" style={{ marginTop: 14 }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 950, letterSpacing: '0.02em' }}>Recent Results</h2>

              {results.length === 0 ? (
                <div className="subtle" style={{ marginTop: 10, fontWeight: 900 }}>
                  No results yet for this driver.
                </div>
              ) : (
                <div className="card" style={{ overflow: 'hidden', borderRadius: 14, marginTop: 12 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="th">Race</th>
                        <th className="th">Start</th>
                        <th className="th">Finish</th>
                        <th className="th">Laps Led</th>
                        <th className="th">Fastest</th>
                        <th className="th">Inc</th>
                        <th className="th">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r, i) => (
                        <tr key={`${r.race_id}-${i}`} className="rowHover">
                          <td className="td" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 }}>
                            {r.race_id.slice(0, 8)}…
                          </td>
                          <td className="td">{r.start_position ?? '—'}</td>
                          <td className="td" style={{ fontWeight: 950 }}>
                            {r.finish_position != null ? `P${r.finish_position}` : '—'}
                          </td>
                          <td className="td">{r.laps_led ?? 0}</td>
                          <td className="td">
                            {r.fastest_lap_time_ms != null ? `${(r.fastest_lap_time_ms / 1000).toFixed(3)}s` : '—'}
                          </td>
                          <td className="td">{r.incidents ?? 0}</td>
                          <td className="td">{r.status ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card cardPad">
      <div style={{ fontSize: 12, color: 'rgba(229,231,235,0.72)', fontWeight: 900 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 950, marginTop: 8 }}>{value}</div>
      {sub && (
        <div className="subtle" style={{ marginTop: 6, fontSize: 12 }}>
          {sub}
        </div>
      )}
    </div>
  )
}








