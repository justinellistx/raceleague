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

        // Humans only for roster display
        const humans = (p ?? []).filter((x: any) => x?.is_human)
        setMembers(humans as Person[])
      }

      // Team season standings (now using correct columns)
      const { data: ss, error: ssErr } = await supabase
        .from('v_iracing_team_season_standings')
        .select('team_id, team, team_season_points')

      if (cancelled) return
      if (!ssErr) {
        const rows = (ss ?? []) as TeamSeasonStandingRow[]
        const sorted = [...rows].sort((a, b) => toNumber(b.team_season_points) - toNumber(a.team_season_points))
        const idx = sorted.findIndex((r) => r.team_id === teamId)
        if (idx >= 0) {
          setSeasonPos(idx + 1)
          setSeasonPoints(toNumber(sorted[idx].team_season_points))
        } else {
          setSeasonPos(null)
          setSeasonPoints(null)
        }
      } else {
        // Non-fatal: preseason or view not ready
        setSeasonPos(null)
        setSeasonPoints(null)
      }

      // Team stage standings (correct columns)
      const { data: st, error: stErr } = await supabase
        .from('v_iracing_team_stage_standings')
        .select('season_id, stage_number, team_id, team, team_stage_points')
        .eq('team_id', teamId)
        .order('stage_number', { ascending: true })

      if (cancelled) return
      if (!stErr) setStageRows((st ?? []) as TeamStageStandingRow[])
      else setStageRows([])

      // Team race points (correct columns)
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
    // Optional: refresh periodically during race night
    const id = setInterval(load, 12000)

    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [teamId])

  const memberCount = members.length

  const teamDisplay = team?.name ?? 'Team'

  const stageSummary = useMemo(() => {
    return stageRows.map((r) => {
      const name = `Stage ${r.stage_number ?? '—'}`
      const points = toNumber(r.team_stage_points)
      return { name, points }
    })
  }, [stageRows])

  const recentTeamRaces = useMemo(() => {
    // “Most recent” based on stage + race number
    const sorted = [...raceRows].sort((a, b) => {
      const aKey = (toNumber(a.stage_number) * 1000) + toNumber(a.race_number)
      const bKey = (toNumber(b.stage_number) * 1000) + toNumber(b.race_number)
      return bKey - aKey
    })
    return sorted.slice(0, 10)
  }, [raceRows])

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
      <Link href="/teams" style={{ textDecoration: 'none', color: '#111', fontWeight: 900 }}>
        ← Back to Teams
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

      {team && (
        <>
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 32, fontWeight: 950 }}>{teamDisplay}</h1>
              <div style={{ marginTop: 6, color: '#333' }}>
                Human drivers on roster: <b style={{ color: '#111' }}>{memberCount}</b>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <Link href="/" style={{ color: '#111', textDecoration: 'underline', fontWeight: 800 }}>
                Home
              </Link>
              <Link href="/drivers" style={{ color: '#111', textDecoration: 'underline', fontWeight: 800 }}>
                Drivers
              </Link>
              <Link href="/teams" style={{ color: '#111', textDecoration: 'underline', fontWeight: 800 }}>
                Teams
              </Link>
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
            }}
          >
            <StatCard
              label="Season Standing"
              value={seasonPos ? `P${seasonPos}` : '—'}
              sub={`Points: ${seasonPoints ?? '—'}`}
            />
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
                <div style={{ color: '#333', fontWeight: 800 }}>No human drivers found for this team.</div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {members.map((m) => (
                    <Link
                      key={m.id}
                      href={`/drivers/${m.id}`}
                      style={{
                        textDecoration: 'none',
                        color: '#111',
                        border: '1px solid #e1e1e1',
                        borderRadius: 12,
                        padding: 10,
                        background: '#fff',
                        display: 'block',
                      }}
                    >
                      <div style={{ fontWeight: 950 }}>{m.display_name ?? 'Unknown'}</div>
                      <div style={{ marginTop: 2, fontSize: 12, color: '#444' }}>Driver profile →</div>
                    </Link>
                  ))}
                </div>
              )}
            </Panel>

            {/* Stage standings */}
            <Panel title="Stage Standings">
              {stageSummary.length === 0 ? (
                <div style={{ color: '#333', fontWeight: 800 }}>
                  No stage standings yet (or view not returning data).
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left' }}>
                      <th style={{ borderBottom: '1px solid #ddd', padding: 8, color: '#111' }}>Stage</th>
                      <th style={{ borderBottom: '1px solid #ddd', padding: 8, color: '#111' }}>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stageSummary.map((s, i) => (
                      <tr key={`${s.name}-${i}`}>
                        <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8, color: '#111' }}>{s.name}</td>
                        <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8, color: '#111' }}>{s.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>

            {/* Recent team race points */}
            <Panel title="Recent Team Race Points">
              {recentTeamRaces.length === 0 ? (
                <div style={{ color: '#333', fontWeight: 800 }}>
                  No team race points yet (or view not returning data).
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left' }}>
                      <th style={{ borderBottom: '1px solid #ddd', padding: 8, color: '#111' }}>Stage</th>
                      <th style={{ borderBottom: '1px solid #ddd', padding: 8, color: '#111' }}>Race</th>
                      <th style={{ borderBottom: '1px solid #ddd', padding: 8, color: '#111' }}>Sum</th>
                      <th style={{ borderBottom: '1px solid #ddd', padding: 8, color: '#111' }}>Top5</th>
                      <th style={{ borderBottom: '1px solid #ddd', padding: 8, color: '#111' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTeamRaces.map((r) => (
                      <tr key={r.race_id}>
                        <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8, color: '#111' }}>
                          {r.stage_number ?? '—'}
                        </td>
                        <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8, color: '#111' }}>
                          {r.race_number ?? '—'}
                        </td>
                        <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8, color: '#111' }}>
                          {toNumber(r.team_points_sum)}
                        </td>
                        <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8, color: '#111' }}>
                          {toNumber(r.team_top5_bonus)}
                        </td>
                        <td style={{ borderBottom: '1px solid #f0f0f0', padding: 8, color: '#111', fontWeight: 950 }}>
                          {toNumber(r.team_total_points)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>
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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
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
      <h2 style={{ margin: 0, marginBottom: 10, fontSize: 16, fontWeight: 950, color: '#111' }}>{title}</h2>
      {children}
    </div>
  )
}
