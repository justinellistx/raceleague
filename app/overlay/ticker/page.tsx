'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type StandingRow = {
  person_id: string
  season_points_counted?: number | null
  driver?: string | null
  people?: { display_name?: string | null } | null
}

export default function OverlayTicker() {
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<Array<{ name: string; pts: number }>>([])

  const load = async () => {
    setError(null)

    // humans
    const { data: humans, error: hErr } = await supabase
      .from('people')
      .select('id')
      .eq('is_human', true)

    if (hErr) return setError(hErr.message)
    const humanIds = new Set((humans ?? []).map((r: any) => r.id))

    // standings: try common view shape. If your view has different columns,
    // tell me the columns and I’ll adjust this file.
    const { data: ss, error: ssErr } = await supabase
      .from('v_iracing_season_standings')
      .select('*')

    if (ssErr) return setError(ssErr.message)

    const rows = (ss ?? []) as any[]

    const list = rows
      .filter((r) => (r.person_id ? humanIds.has(r.person_id) : true))
      .map((r) => ({
        name: r.driver ?? r.people?.display_name ?? r.display_name ?? 'Driver',
        pts: Number(r.season_points_counted ?? r.points ?? r.season_points ?? 0) || 0,
      }))
      .sort((a, b) => b.pts - a.pts)
      .slice(0, 20)

    setItems(list)
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 6000)
    return () => clearInterval(t)
  }, [])

  const tickerText = useMemo(() => {
    if (items.length === 0) return 'Standings unavailable'
    return items.map((it, idx) => `P${idx + 1} ${it.name} ${it.pts}`).join('   •   ')
  }, [items])

  return (
    <main style={{ padding: 0, background: 'transparent', fontFamily: 'system-ui' }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '12px 16px',
          background: 'rgba(10,10,12,0.92)',
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ fontWeight: 900 }}>CHAMPIONSHIP</div>

          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            <div
              style={{
                whiteSpace: 'nowrap',
                display: 'inline-block',
                paddingLeft: '100%',
                animation: 'scroll 28s linear infinite',
                fontWeight: 800,
                opacity: 0.95,
              }}
            >
              {tickerText}
              <span style={{ padding: '0 24px' }} />
              {tickerText}
            </div>
          </div>
        </div>

        {error && <div style={{ marginTop: 8, color: '#ff9b9b' }}>Error: {error}</div>}
      </div>

      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </main>
  )
}

