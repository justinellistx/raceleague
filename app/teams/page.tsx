'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
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

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [q, setQ] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setError(null)

      const { data: t, error: tErr } = await supabase
        .from('teams')
        .select('id, name')
        .order('name', { ascending: true })

      if (cancelled) return
      if (tErr) return setError(tErr.message)
      setTeams((t ?? []) as Team[])

      const { data: tm, error: tmErr } = await supabase
        .from('team_members')
        .select('team_id, person_id')

      if (cancelled) return
      if (tmErr) return setError(tmErr.message)
      setTeamMembers((tm ?? []) as TeamMember[])

      // We only need people to count humans accurately
      const { data: p, error: pErr } = await supabase
        .from('people')
        .select('id, display_name, is_human')

      if (cancelled) return
      if (pErr) return setError(pErr.message)
      setPeople((p ?? []) as Person[])
    }

    load()

    // Lightweight auto-refresh so roster counts stay accurate
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

  const filteredTeams = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const list = needle
      ? teams.filter((t) => (t.name ?? '').toLowerCase().includes(needle))
      : teams

    return [...list].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
  }, [teams, q])

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
      {/* Top nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <h1 style={{ fontSize: 28, fontWeight: 950, marginBottom: 10, marginTop: 0 }}>Teams</h1>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
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

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search team..."
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
        <div style={{ alignSelf: 'center', color: '#333', fontWeight: 800 }}>
          {filteredTeams.length} teams
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
        {filteredTeams.map((t) => (
          <Link
            key={t.id}
            href={`/teams/${t.id}`}
            style={{
              textDecoration: 'none',
              color: '#111',
              border: '1px solid #d7d7d7',
              borderRadius: 14,
              padding: 16,
              background: '#fff',
              boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
              display: 'block',
            }}
          >
            <div style={{ fontWeight: 950, fontSize: 16 }}>{t.name ?? 'Team'}</div>

            <div style={{ marginTop: 8, fontSize: 13, color: '#333' }}>
              Human drivers:{' '}
              <b style={{ color: '#111' }}>{humanCountByTeamId.get(t.id) ?? 0}</b>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, color: '#333', fontWeight: 800 }}>
              View team profile →
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}

