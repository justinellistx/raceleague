'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import SiteNav from '@/app/components/SiteNav'
import Avatar from '@/app/components/Avatar'

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
  const router = useRouter()

  const [drivers, setDrivers] = useState<Person[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [q, setQ] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setError(null)

      const { data: people, error: peopleErr } = await supabase
        .from('people')
        .select('id, display_name, is_human')
        .eq('is_human', true)
        .order('display_name', { ascending: true })

      if (cancelled) return
      if (peopleErr) {
        setError(peopleErr.message)
        return
      }

      const cleaned: Person[] = (people ?? []).filter(
        (p: unknown): p is Person =>
          typeof (p as Person)?.id === 'string'
      )
      setDrivers(cleaned)

      const { data: t, error: tErr } = await supabase
        .from('teams')
        .select('id, name')
        .order('name', { ascending: true })

      if (cancelled) return
      if (tErr) {
        setError(tErr.message)
        return
      }
      setTeams((t ?? []) as Team[])

      const { data: tm, error: tmErr } = await supabase
        .from('team_members')
        .select('team_id, person_id')

      if (cancelled) return
      if (tmErr) {
        setError(tmErr.message)
        return
      }
      setTeamMembers((tm ?? []) as TeamMember[])
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  const teamById = useMemo(() => {
    const map = new Map<string, Team>()
    for (const t of teams) map.set(t.id, t)
    return map
  }, [teams])

  const teamIdByPersonId = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of teamMembers) {
      if (m.person_id && m.team_id) map.set(m.person_id, m.team_id)
    }
    return map
  }, [teamMembers])

  const teamNameByPersonId = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of teamMembers) {
      const t = teamById.get(m.team_id)
      map.set(m.person_id, t?.name ?? 'Team')
    }
    return map
  }, [teamMembers, teamById])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = needle
      ? drivers.filter((d) => (d.display_name ?? '').toLowerCase().includes(needle))
      : drivers

    return [...list].sort((a, b) => (a.display_name ?? '').localeCompare(b.display_name ?? ''))
  }, [drivers, q])

  const goToDriver = (id: string) => {
    // Your profile route is /driver/[personId] (singular)
    router.push(`/driver/${id}`)
  }

  return (
    <>
      <SiteNav />

      <main className="container">
        <h1 className="h1">Drivers</h1>
        <div className="subtle" style={{ marginBottom: 16 }}>
          Humans only • Click a driver to view profile
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search driver..."
            style={{ width: 320 }}
          />
          <div className="subtle" style={{ fontWeight: 950 }}>
            {filtered.length} drivers
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
            gap: 12,
          }}
        >
          {filtered.map((d) => {
            const teamId = teamIdByPersonId.get(d.id) ?? null
            const teamName = teamNameByPersonId.get(d.id) ?? '—'
            const driverName = d.display_name ?? 'Unknown'

            return (
              <div
                key={d.id}
                className="card"
                role="button"
                tabIndex={0}
                onClick={() => goToDriver(d.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') goToDriver(d.id)
                }}
                style={{
                  cursor: 'pointer',
                  padding: 16,
                  borderRadius: 18,
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.09), rgba(255,255,255,0.06))',
                }}
              >
                {/* top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
                    <Avatar personId={d.id} displayName={driverName} size={44} />
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 950,
                          fontSize: 16,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {driverName}
                      </div>
                      <div className="subtle" style={{ marginTop: 2, fontSize: 12 }}>
                        ID:{' '}
                        <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                          {d.id.slice(0, 8)}…
                        </span>
                      </div>
                    </div>
                  </div>

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
                      flexShrink: 0,
                    }}
                  >
                    HUMAN
                  </span>
                </div>

                {/* team row */}
                <div className="subtle" style={{ marginTop: 12 }}>
                  Team:{' '}
                  {teamId ? (
                    <Link
                      href={`/teams/${teamId}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        color: '#e5e7eb',
                        fontWeight: 950,
                        textDecoration: 'none',
                        borderBottom: '1px solid rgba(96,165,250,0.45)',
                      }}
                    >
                      {teamName}
                    </Link>
                  ) : (
                    <span style={{ fontWeight: 950, color: '#e5e7eb' }}>{teamName}</span>
                  )}
                </div>

                <div className="subtle" style={{ marginTop: 12, fontWeight: 950 }}>
                  View profile →
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </>
  )
}






