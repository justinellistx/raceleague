'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import SiteNav from '@/app/components/SiteNav'
import { supabase } from '@/lib/supabaseClient'

type Breakdown = {
  base_points?: number
  bonuses?: {
    pole_position?: number
    most_laps_led?: number
    fastest_lap?: number
    clean_race?: number
  }
  penalties?: {
    incidents?: number
  }
}

type RacePointsRow = {
  person_id: string
  is_human: boolean | null
  base_points: number | null
  bonus_points: number | null
  penalty_points: number | null
  total_points: number | null
  breakdown: Breakdown | null
}

type PersonRow = {
  id: string
  display_name: string | null
}

type StandingRow = {
  person_id: string
  driver: string | null

  // Totals
  base_total: number
  total_points: number

  // Bonus columns you asked for
  pole_bonus: number // “starting position bonus” (pole)
  most_laps_led_bonus: number
  fastest_lap_bonus: number
  clean_race_bonus: number

  // Penalty column you asked for
  incidents_penalty: number
}

const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0)

export default function StandingsPage() {
  const router = useRouter()

  const [rows, setRows] = useState<StandingRow[]>([])
  const [q, setQ] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setError(null)
      setLoading(true)

      // Pull race points + breakdown for HUMANS ONLY
      const { data: points, error: pErr } = await supabase
        .from('v_iracing_race_points_calc')
        .select('person_id, is_human, base_points, bonus_points, penalty_points, total_points, breakdown')
        .eq('is_human', true)

      if (cancelled) return
      if (pErr) {
        setError(pErr.message)
        setLoading(false)
        return
      }

      const pts = (points ?? []) as RacePointsRow[]
      const personIds = Array.from(new Set(pts.map((r) => r.person_id)))

      const { data: people, error: peopleErr } = await supabase
        .from('people')
        .select('id, display_name')
        .in('id', personIds)

      if (cancelled) return
      if (peopleErr) {
        setError(peopleErr.message)
        setLoading(false)
        return
      }

      const nameById = new Map<string, string>(
        ((people ?? []) as PersonRow[]).map((p) => [p.id, p.display_name ?? 'Unknown'])
      )

      // Aggregate per driver
      const agg = new Map<string, StandingRow>()

      for (const r of pts) {
        if (r.is_human !== true) continue

        const b = r.breakdown ?? null
        const bonuses = b?.bonuses ?? {}
        const penalties = b?.penalties ?? {}

        const cur = agg.get(r.person_id) ?? {
          person_id: r.person_id,
          driver: nameById.get(r.person_id) ?? 'Unknown',

          base_total: 0,
          total_points: 0,

          pole_bonus: 0,
          most_laps_led_bonus: 0,
          fastest_lap_bonus: 0,
          clean_race_bonus: 0,

          incidents_penalty: 0,
        }

        // Totals (from columns)
        cur.base_total += r.base_points ?? 0
        cur.total_points += r.total_points ?? 0

        // Bonus breakdown (from JSON)
        cur.pole_bonus += n(bonuses.pole_position)
        cur.most_laps_led_bonus += n(bonuses.most_laps_led)
        cur.fastest_lap_bonus += n(bonuses.fastest_lap)
        cur.clean_race_bonus += n(bonuses.clean_race)

        // Penalty breakdown (from JSON)
        cur.incidents_penalty += n(penalties.incidents)

        agg.set(r.person_id, cur)
      }

      const list = Array.from(agg.values()).sort((a, b) => b.total_points - a.total_points)
      setRows(list)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((r) => (r.driver ?? '').toLowerCase().includes(needle))
  }, [rows, q])

  return (
    <>
      <SiteNav />

      <main className="container">
        <h1 className="h1">Standings</h1>
        <div className="subtle" style={{ marginBottom: 16 }}>
          Humans only • Bonus & penalties shown by type
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

        {loading ? (
          <div className="card cardPad">
            <div className="subtle" style={{ fontWeight: 900 }}>Loading standings…</div>
          </div>
        ) : filtered.length === 0 && !error ? (
          <div className="card cardPad">
            <div className="subtle" style={{ fontWeight: 900 }}>No standings yet (preseason).</div>
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden', borderRadius: 16 }}>
            <div
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 1,
                background: 'rgba(15, 23, 42, 0.92)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(255,255,255,0.10)',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '70px 1fr 90px 90px 110px 110px 110px 110px 120px',
                  padding: '12px 14px',
                  fontWeight: 950,
                  color: '#e5e7eb',
                  letterSpacing: '0.04em',
                  fontSize: 12,
                }}
              >
                <div>POS</div>
                <div>DRIVER</div>
                <div style={{ textAlign: 'right' }}>BASE</div>
                <div style={{ textAlign: 'right' }}>POLE</div>
                <div style={{ textAlign: 'right' }}>MLL</div>
                <div style={{ textAlign: 'right' }}>FAST LAP</div>
                <div style={{ textAlign: 'right' }}>CLEAN</div>
                <div style={{ textAlign: 'right' }}>INC PEN</div>
                <div style={{ textAlign: 'right' }}>TOTAL</div>
              </div>
            </div>

            {filtered.map((r, idx) => {
              const pos = idx + 1
              return (
                <div
                  key={r.person_id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/drivers/${r.person_id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') router.push(`/drivers/${r.person_id}`)
                  }}
                  className="rowHover"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '70px 1fr 90px 90px 110px 110px 110px 110px 120px',
                    padding: '12px 14px',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                  }}
                >
                  <div style={{ fontWeight: 950, color: '#e5e7eb' }}>{pos}</div>

                  <div style={{ fontWeight: 950, color: '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.driver ?? 'Driver'}
                  </div>

                  <div style={{ textAlign: 'right', fontWeight: 900, color: '#e5e7eb' }}>{r.base_total}</div>
                  <div style={{ textAlign: 'right', fontWeight: 900, color: '#e5e7eb' }}>{r.pole_bonus}</div>
                  <div style={{ textAlign: 'right', fontWeight: 900, color: '#e5e7eb' }}>{r.most_laps_led_bonus}</div>
                  <div style={{ textAlign: 'right', fontWeight: 900, color: '#e5e7eb' }}>{r.fastest_lap_bonus}</div>
                  <div style={{ textAlign: 'right', fontWeight: 900, color: '#e5e7eb' }}>{r.clean_race_bonus}</div>
                  <div style={{ textAlign: 'right', fontWeight: 900, color: '#e5e7eb' }}>{r.incidents_penalty}</div>

                  <div style={{ textAlign: 'right', fontWeight: 950, color: '#e5e7eb' }}>{r.total_points}</div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}






