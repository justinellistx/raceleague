'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import SiteNav from '@/app/components/SiteNav'

type Team = {
  id: string
  name: string | null
}

type TeamMember = {
  team_id: string
  person_id: string
}

type Person = {
  id: string
  display_name: string | null
  is_human: boolean | null
}

// Views (confirmed columns)
type TeamSeasonStandingRow = {
  season_id: string
  team_id: string
  team: string | null
  team_season_points: number | string | null
}

type TeamStageStandingRow = {
  season_id: string
  stage_number: number | null
  team_id: string
  team: string | null
  team_stage_points: number | string | null
}

type TeamRacePointsRow = {
  season_id: string
  stage_number: number | null
  race_number: number | null
  race_id: string
  team_id: string
  team_name: string | null
  team_points_sum: number | null
  team_top5_bonus: number | null
  team_total_points: number | null
}

function toNumber(v: any): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export default function TeamProfilePage() {
  const params = useParams()
  const teamId = (params as any)?.teamId as string | undefined

  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<Person[]>([])
  const [seasonPos, setSeasonPos] = useState<number | null>(null)
  const [seasonPoints, setSeasonPoints] = useState<number | null>(null)
  const [stageRows, setStageRows] = useState<TeamStageStandingRow[]>([])
  const [raceRows, setRaceRows] = useState<TeamRacePointsRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setError(null)

      if (!teamId || teamId === 'undefined') {
        setError('Invalid team link (missing id). Go back and click a team again.')
        return
      }

      // Team
      const { data: t, error: tErr } = await supabase
        .from('teams')
        .select('id, name')
        .eq('id', teamId)
        .maybeSingle()

      if (cancelled) return
      if (tErr) return setError(tErr.message)
      if (!t) return setError('Team not found.')
      setTeam(t as Team)

      // Members -> people
      const { data: tm, error: tmErr } = await supabase
        .from('team_members')
        .select('team_id, person_id')
        .eq('team_id', teamId)

      if (cancelled) return
      if (tmErr) return setError(tmErr.message)

      const memberIds = (tm ?? []).map((m: TeamMember) => m.person_id).filter(Boolean)

      if (memberIds.length === 0) {
        setMembers([])
      } else {
        const { data: p, error: pErr } = await supabase
          .from('people')
          .select('id, display_name, is_human')
          .in('id', memberIds)
          .order('display_name', { ascending: true })

        if (cancelled) return
        if (pErr) return setError(pErr.message)

        const humans = (p ?? []).filter((x: any) => x?.is_human)
        setMembers(humans as Person[])
      }

      // Team season standings
      const { data: ss, error: ssErr } = await supabase
        .from('v_iracing_team_season_standings')
        .select('team_id, team, team_season_points')

      if (cancelled) return
      if (!ssErr) {
        const rows = (ss ?? []) as TeamSeasonStandingRow[]
        const sorted = [...rows].sort(
          (a, b) => toNumber(b.team_season_points) - toNumber(a.team_season_points)
        )
        const idx = sorted.findIndex((r) => r.team_id === teamId)
        if (idx >= 0) {
          setSeasonPos(idx + 1)
          setSeasonPoints(toNumber(sorted[idx].team_season_points))
        } else {
          setSeasonPos(null)
          setSeasonPoints(null)
        }
      } else {
        setSeasonPos(null)
        setSeasonPoints(null)
      }

      // Team stage standings
      const { data: st, error: stErr } = await supabase
        .from('v_iracing_team_stage_standings')
        .select('season_id, stage_number, team_id, team, team_stage_points')
        .eq('team_id', teamId)
        .order('stage_number', { ascending: true })

      if (cancelled) return
      if (!stErr) setStageRows((st ?? []) as TeamStageStandingRow[])
      else setStageRows([])

      // Team race points
      const { data: tr, error: trErr } = await supabase
        .from('v_iracing_team_race_points')
        .select(
          'season_id, stage_number, race_number, race_id, team_id, team_name, team_points_sum, team_top5_bonus, team_total_points'
        )
        .eq('team_id', teamId)
        .order('stage_number', { ascending: true })
        .order('race_number', { ascending: true })

      if (cancelled) return
      if (!trErr) setRaceRows((tr ?? []) as TeamRacePointsRow[])
      else setRaceRows([])
    }

    load()
    const id = setInterval(load, 12000)

    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [teamId])

  const teamDisplay = team?.name ?? 'Team'
  const memberCount = members.length

  const stageSummary = useMemo(() => {
    return stageRows.map((r) => ({
      name: `Stage ${r.stage_number ?? '—'}`,
      points: toNumber(r.team_stage_points),
    }))
  }, [stageRows])

  const recentTeamRaces = useMemo(() => {
    const sorted = [...raceRows].sort((a, b) => {
      const aKey = toNumber(a.stage_number) * 1000 + toNumber(a.race_number)
      const bKey = toNumber(b.stage_number) * 1000 + toNumber(b.race_number)
      return bKey - aKey
    })
    return sorted.slice(0, 10)
  }, [raceRows])

  return (
    <>
      <SiteNav />

      <main className="container">
        <Link
          href="/teams"
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
          ← Back to Teams
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

        {team && (
          <>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h1 className="h1" style={{ marginBottom: 6 }}>
                  {teamDisplay}
                </h1>
                <div className="subtle">
                  Human drivers on roster: <b style={{ color: '#e5e7eb' }}>{memberCount}</b>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 950,
                    padding: '6px 10px',
                    borderRadius: 999,
                    border: '1px solid rgba(34,197,94,0.35)',
                    background: 'rgba(34,197,94,0.10)',
                    color: '#e5e7eb',
                  }}
                >
                  ROSTER {memberCount}
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
                  }}
                >
                  {seasonPos ? `SEASON P${seasonPos}` : 'SEASON —'}
                </span>
              </div>
            </div>

            {/* Stat cards */}
            <div
              style={{
                marginTop: 16,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12,
              }}
            >
              <StatCard label="Season Standing" value={seasonPos ? `P${seasonPos}` : '—'} sub={`Points: ${seasonPoints ?? '—'}`} />
              <StatCard label="Roster Size" value={`${memberCount}`} />
              <StatCard label="Stages Tracked" value={`${stageSummary.length}`} />
            </div>

            <div
              style={{
                marginTop: 18,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 12,
              }}
            >
              {/* Roster */}
              <Panel title="Roster (Humans)">
                {members.length === 0 ? (
                  <div className="subtle" style={{ fontWeight: 900 }}>
                    No human drivers found for this team.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: 10 }}>
                    {members.map((m) => (
                      <Link
                        key={m.id}
                        href={`/drivers/${m.id}`}
                        style={{
                          textDecoration: 'none',
                          color: '#e5e7eb',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: 14,
                          padding: 12,
                          background: 'rgba(255,255,255,0.04)',
                          display: 'block',
                        }}
                      >
                        <div style={{ fontWeight: 950 }}>{m.display_name ?? 'Unknown'}</div>
                        <div className="subtle" style={{ marginTop: 4, fontSize: 12 }}>
                          Driver profile →
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </Panel>

              {/* Stage standings */}
              <Panel title="Stage Standings">
                {stageSummary.length === 0 ? (
                  <div className="subtle" style={{ fontWeight: 900 }}>
                    No stage standings yet (or view not returning data).
                  </div>
                ) : (
                  <div className="card" style={{ overflow: 'hidden', borderRadius: 14 }}>
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
                        {stageSummary.map((s, i) => (
                          <tr key={`${s.name}-${i}`} className="rowHover">
                            <td className="td" style={{ fontWeight: 900 }}>
                              {s.name}
                            </td>
                            <td className="td" style={{ textAlign: 'right', fontWeight: 950 }}>
                              {s.points}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>

              {/* Recent team race points */}
              <Panel title="Recent Team Race Points">
                {recentTeamRaces.length === 0 ? (
                  <div className="subtle" style={{ fontWeight: 900 }}>
                    No team race points yet (or view not returning data).
                  </div>
                ) : (
                  <div className="card" style={{ overflow: 'hidden', borderRadius: 14 }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th className="th">Stage</th>
                          <th className="th">Race</th>
                          <th className="th" style={{ textAlign: 'right' }}>
                            Sum
                          </th>
                          <th className="th" style={{ textAlign: 'right' }}>
                            Top5
                          </th>
                          <th className="th" style={{ textAlign: 'right' }}>
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentTeamRaces.map((r) => (
                          <tr key={r.race_id} className="rowHover">
                            <td className="td">{r.stage_number ?? '—'}</td>
                            <td className="td">{r.race_number ?? '—'}</td>
                            <td className="td" style={{ textAlign: 'right', fontWeight: 900 }}>
                              {toNumber(r.team_points_sum)}
                            </td>
                            <td className="td" style={{ textAlign: 'right', fontWeight: 900 }}>
                              {toNumber(r.team_top5_bonus)}
                            </td>
                            <td className="td" style={{ textAlign: 'right', fontWeight: 950 }}>
                              {toNumber(r.team_total_points)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
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
      {sub && <div className="subtle" style={{ marginTop: 6, fontSize: 12 }}>{sub}</div>}
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card cardPad">
      <h2 style={{ margin: 0, marginBottom: 12, fontSize: 14, fontWeight: 950, letterSpacing: '0.02em' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

