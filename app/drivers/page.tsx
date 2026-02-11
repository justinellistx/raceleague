'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import SiteNav from '@/app/components/SiteNav'

type Person = {
  id: string
  display_name: string | null
  is_human: boolean | null
}

type Team = {
  id: string
  name: string | null
}

type TeamMember = {
  team_id: string
  person_id: string
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Person[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [q, setQ] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setError(null)

      // Humans only (hide AI)
      const { data: people, error: peopleErr } = await supabase
        .from('people')
        .select('id, display_name, is_human')
        .eq('is_human', true)
        .order('display_name', { ascending: true })

      if (peopleErr) {
        setError(peopleErr.message)
        return
      }

      const cleaned: Person[] = (people ?? []).filter(
        (p: any): p is Person => typeof p?.id === 'string'
      )
      setDrivers(cleaned)

      const { data: t, error: tErr } = await supabase
        .from('teams')
        .select('id, name')
        .order('name', { ascending: true })

      if (tErr) {
        setError(tErr.message)
        return
      }
      setTeams((t ?? []) as Team[])

      const { data: tm, error: tmErr } = await supabase
        .from('team_members')
        .select('team_id, person_id')

      if (tmErr) {
        setError(tmErr.message)
        return
      }
      setTeamMembers((tm ?? []) as TeamMember[])
    }

    load()
  }, [])

  const teamById = useMemo(() => {
    const map = new Map<string, Team>()
    teams.forEach((t) => map.set(t.id, t))
    return map
  }, [teams])

  // person_id -> team_id
  const teamIdByPersonId = useMemo(() => {
    const map = new Map<string, string>()
    teamMembers.forEach((m) => {
      if (m.person_id && m.team_id) map.set(m.person_id, m.team_id)
    })
    return map
  }, [teamMembers])

  // person_id -> team name
  const teamNameByPersonId = useMemo(() => {
    const map = new Map<string, string>()
    teamMembers.forEach((m) => {
      const t = teamById.get(m.team_id)
      map.set(m.person_id, t?.name ?? 'Team')
    })
    return map
  }, [teamMembers, teamById])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = needle
      ? drivers.filter((d) => (d.display_name ?? '').toLowerCase().includes(needle))
      : drivers

    return [...list].sort((a, b) => (a.display_name ?? '').localeCompare(b.display_name ?? ''))
  }, [drivers, q])

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
      <h1 style={{ fontSize: 28, fontWeight: 950, marginBottom: 10 }}>Drivers</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search driver..."
          style={{
            width: 320,
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid #ddd',
            outline: 'none',
            color: '#111',
            background: '#fff',
          }}
        />
        <div style={{ color: '#333', fontWeight: 800, alignSelf: 'center' }}>
          {filtered.length} drivers
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: 12,
            background: '#fee',
            border: '1px solid #f99',
            borderRadius: 12,
            color: '#111',
            marginBottom: 12,
          }}
        >
          Error: {error}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 12,
        }}
      >
        {filtered.map((d) => {
          const teamId = teamIdByPersonId.get(d.id) ?? null
          const teamName = teamNameByPersonId.get(d.id) ?? '—'

          return (
            <a
              key={d.id}
              href={`/drivers/${d.id}`}
              style={{
                textDecoration: 'none',
                color: '#111',
                border: '1px solid #d7d7d7',
                borderRadius: 14,
                padding: 16,
                background: '#fff',
                boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div
                  style={{
                    fontWeight: 950,
                    fontSize: 16,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {d.display_name ?? 'Unknown'}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    padding: '4px 10px',
                    borderRadius: 999,
                    border: '1px solid #ccc',
                    background: '#dff5e7',
                    color: '#111',
                  }}
                >
                  HUMAN
                </div>
              </div>

              <div style={{ marginTop: 8, fontSize: 13, color: '#333' }}>
                Team:{' '}
                {teamId ? (
                  // Stop the card-click and route to the team page instead
                  <a
                    href={`/teams/${teamId}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{ color: '#111', fontWeight: 900, textDecoration: 'underline' }}
                  >
                    {teamName}
                  </a>
                ) : (
                  <span style={{ fontWeight: 900, color: '#111' }}>{teamName}</span>
                )}
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: '#333', fontWeight: 800 }}>
                View profile →
              </div>
            </a>
          )
        })}
      </div>
    </main>
  )
}



