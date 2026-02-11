'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import SiteNav from '@/app/components/SiteNav'

type EventRow = {
  id: string
  name: string | null
  race_number: number | null
  stage_number: number | null
}

export default function ControlRoom() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [eventId, setEventId] = useState<string>('')
  const [token, setToken] = useState<string>('')
  const [msg, setMsg] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      setMsg('')
      const { data, error } = await supabase
        .from('events')
        .select('id, name, race_number, stage_number')
        .order('race_number', { ascending: true })

      if (error) setMsg(error.message)
      else setEvents((data as any) ?? [])
    }
    load()
  }, [])

  const setLive = async () => {
    setMsg('')
    const res = await fetch('/api/broadcast/set-active-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, token }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) setMsg(json.error ?? 'Failed')
    else setMsg('✅ Live race set!')
  }

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui', maxWidth: 720 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12 }}>Control Room</h1>

      <label style={{ fontWeight: 700 }}>Admin Token</label>
      <input
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Enter broadcast admin token"
        style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 10, marginTop: 6 }}
      />

      <div style={{ height: 12 }} />

      <label style={{ fontWeight: 700 }}>Active Event</label>
      <select
        value={eventId}
        onChange={(e) => setEventId(e.target.value)}
        style={{ width: '100%', padding: 10, border: '1px solid #ddd', borderRadius: 10, marginTop: 6 }}
      >
        <option value="">— None —</option>
        {events.map((e) => (
          <option key={e.id} value={e.id}>
            Race {String(e.race_number ?? 0).padStart(2, '0')} (Stage {e.stage_number ?? '—'}) — {e.name ?? 'TBD'}
          </option>
        ))}
      </select>

      <button
        onClick={setLive}
        style={{
          marginTop: 14,
          padding: 12,
          borderRadius: 12,
          border: '1px solid #111',
          background: '#111',
          color: '#fff',
          fontWeight: 800,
          cursor: 'pointer',
          width: '100%',
        }}
      >
        Set Live Race
      </button>

      {msg && <div style={{ marginTop: 12, color: msg.startsWith('✅') ? '#0a0' : '#c00' }}>{msg}</div>}
    </main>
  )
}

