'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import SiteNav from '@/app/components/SiteNav'

type Team = {
  id: string
  name: string | null
  stage_number: number | null
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

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [q, setQ] = useState<string>('')
  const [stage, setStage] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setError(null)

      const { data: t, error: tErr } = await supabase
        .from('teams')
        .select('id, name, stage_number')
        .order('name', { ascending: true })

      if (cancelled) return
      if (tErr) return setError(tErr.message)
      const teamRows = (t ?? []) as Team[]
      setTeams(teamRows)
      // Default the stage filter to the current (highest) stage that has teams.
      setStage((prev) => {
        if (prev != null) return prev
        const stages = teamRows.map((x) => x.stage_number ?? 1)
        return stages.length ? Math.max(...stages) : 1
      })

      const { data: tm, error: tmErr } = await supabase
        .from('team_members')
        .select('team_id, person_id')

      if (cancelled) return
      if (tmErr) return setError(tmErr.message)
      setTeamMembers((tm ?? []) as TeamMember[])

      const { data: p, error: pErr } = await supabase
        .from('people')
        .select('id, display_name, is_human')

      if (cancelled) return
      if (pErr) return setError(pErr.message)
      setPeople((p ?? []) as Person[])
    }

    load()
    const id = setInterval(load, 10000)

    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const peopleById = useMemo(() => {
    const map = new Map<string, Person>()
    for (const p of people) map.set(p.id, p)
    return map
  }, [people])

  const humanCountByTeamId = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of teamMembers) {
      const person = peopleById.get(m.person_id)
      const isHuman = !!person?.is_human
      if (!isHuman) continue
      map.set(m.team_id, (map.get(m.team_id) ?? 0) + 1)
    }
    return map
  }, [teamMembers, peopleById])

  const availableStages = useMemo(() => {
    const set = new Set<number>()
    for (const t of teams) set.add(t.stage_number ?? 1)
    return Array.from(set).sort((a, b) => a - b)
  }, [teams])

  const filteredTeams = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let list = stage == null ? teams : teams.filter((t) => (t.stage_number ?? 1) === stage)
    if (needle) list = list.filter((t) => (t.name ?? '').toLowerCase().includes(needle))
    return [...list].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
  }, [teams, q, stage])

  return (
    <>
      <SiteNav />

      <main className="container">
        <h1 className="h1">Teams</h1>
        <div className="subtle" style={{ marginBottom: 16 }}>
          Team rosters and standings (humans only).
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search team..."
            style={{ width: 320 }}
          />
          {availableStages.length > 1 && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="subtle" style={{ fontWeight: 950 }}>Stage</span>
              {availableStages.map((s) => (
                <button
                  key={s}
                  onClick={() => setStage(s)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 12,
                    fontWeight: 950,
                    cursor: 'pointer',
                    color: '#e5e7eb',
                    border: stage === s ? '1px solid rgba(96,165,250,0.6)' : '1px solid rgba(255,255,255,0.14)',
                    background: stage === s ? 'rgba(96,165,250,0.18)' : 'rgba(255,255,255,0.06)',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="subtle" style={{ fontWeight: 950 }}>
            {filteredTeams.length} teams
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

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 12,
          }}
        >
          {filteredTeams.map((t) => (
            <Link
              key={t.id}
              href={`/teams/${t.id}`}
              className="card"
              style={{
                textDecoration: 'none',
                color: 'inherit',
                padding: 16,
                display: 'block',
                borderRadius: 18,
                transition: 'transform 0.12s ease, border-color 0.12s ease',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as any).style.transform = 'translateY(-2px)'
                ;(e.currentTarget as any).style.borderColor = 'rgba(96,165,250,0.35)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as any).style.transform = 'translateY(0px)'
                ;(e.currentTarget as any).style.borderColor = 'rgba(255,255,255,0.12)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 950, fontSize: 16 }}>{t.name ?? 'Team'}</div>

                <div
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
                  Humans: {humanCountByTeamId.get(t.id) ?? 0}
                </div>
              </div>

              <div className="subtle" style={{ marginTop: 10 }}>
                View team profile →
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  )
}


