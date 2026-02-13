'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import SiteNav from '@/app/components/SiteNav'
import { supabase } from '@/lib/supabaseClient'

type RacePointsRow = {
  person_id: string
  is_human: boolean | null
  base_points: number | null
  bonus_points: number | null
  penalty_points: number | null
  total_points: number | null
}

type PersonRow = {
  id: string
  display_name: string | null
}

type StandingRow = {
  person_id: string
  driver: string | null
  base_points: number
  bonus_points: number
  penalty_points: number
  season_points_counted: number
}

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

      // 1) Pull ALL scored race points for HUMANS ONLY
      const { data: points, error: pErr } = await supabase
        .from('v_iracing_race_points_calc')
        .select('person_id, is_human, base_points, bonus_points, penalty_points, total_points')
        .eq('is_human', true)

      if (cancelled) return
      if (pErr) {
        setError(pErr.message)
        setLoading(false)
        return
      }

      const pts = (points ?? []) as RacePointsRow[]
      const personIds = Array.from(new Set(pts.map((r) => r.person_id)))

      // 2) Get names
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

      // 3) Aggregate totals by driver
      const agg = new Map<string, StandingRow>()

      for (const r of pts) {
        if (r.is_human !== true) continue

        const cur = agg.get(r.person_id) ?? {
          person_id: r.person_id,
          driver: nameById.get(r.person_id) ?? 'Unknown',
          base_points: 0,
          bonus_points: 0,
          penalty_points: 0,
          season_points_counted: 0,
        }

        cur.base_points += r.base_points ?? 0
        cur.bonus_points += r.bonus_points ?? 0
        cur.penalty_points += r.penalty_points ?? 0
        cur.season_points_counted += r.total_points ?? 0

        agg.set(r.person_id, cur)
      }

      const list = Array.from(agg.values()).sort((a, b) => b.season_points_counted - a.season_points_counted)

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

  const top3 = filtered.slice(0, 3)

  return (
    <>
      <SiteNav />

      <main className="container">
        <h1 className="h1">Standings</h1>
        <div className="subtle" style={{ marginBottom: 16 }}>
          Season points (Humans only) • Click a driver to open profile
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
            <div className="subtle" style={{ fontWeight: 900 }}>
              Loading standings…
            </div>
          </div>
        ) : filtered.length === 0 && !error ? (
          <div className="card cardPad">
            <div className="subtle" style={{ fontWeight: 900 }}>
              No standings yet (preseason).
            </div>
          </div>
        ) : (
          <>
            {/* Podium */}
            {top3.length > 0 && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 12,
                  marginBottom: 14,
                }}
              >
                {top3.map((r, i) => (
                  <div
                    key={`podium-${r.person_id}-${i}`}
                    className="card cardPad"
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/drivers/${r.person_id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') router.push(`/drivers/${r.person_id}`)
                    }}
                    style={{
                      cursor: 'pointer',
                      borderColor:
                        i === 0
                          ? 'rgba(250,204,21,0.35)'
                          : i === 1
                          ? 'rgba(148,163,184,0.35)'
                          : 'rgba(244,114,182,0.30)',
                      background:
                        i === 0
                          ? 'linear-gradient(180deg, rgba(250,204,21,0.16), rgba(255,255,255,0.06))'
                          : i === 1
                          ? 'linear-gradient(180deg, rgba(148,163,184,0.14), rgba(255,255,255,0.06))'
                          : 'linear-gradient(180deg, rgba(244,114,182,0.12), rgba(255,255,255,0.06))',
                    }}
                  >
                    <div className="subtle" style={{ fontWeight: 950, letterSpacing: '0.08em' }}>
                      {i === 0 ? 'LEADER' : i === 1 ? 'P2' : 'P3'}
                    </div>
                    <div style={{ marginTop: 8, fontWeight: 950, fontSize: 18 }}>{r.driver ?? 'Driver'}</div>
                    <div className="subtle" style={{ marginTop: 6, fontWeight: 950 }}>
                      {Number(r.season_points_counted ?? 0)} pts
                      {r.bonus_points ? ` • +${r.bonus_points} bonus` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Standings table */}
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
                    gridTemplateColumns: '80px 1fr 110px 110px 110px 140px',
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
                  <div style={{ textAlign: 'right' }}>BONUS</div>
                  <div style={{ textAlign: 'right' }}>PEN</div>
                  <div style={{ textAlign: 'right' }}>TOTAL</div>
                </div>
              </div>

              {filtered.map((r, idx) => {
                const pos = idx + 1
                const highlight =
                  pos === 1
                    ? 'rgba(250,204,21,0.18)'
                    : pos === 2
                    ? 'rgba(148,163,184,0.16)'
                    : pos === 3
                    ? 'rgba(244,114,182,0.14)'
                    : null

                return (
                  <div
                    key={r.person_id ?? `${idx}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/drivers/${r.person_id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') router.push(`/drivers/${r.person_id}`)
                    }}
                    className="rowHover"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '80px 1fr 110px 110px 110px 140px',
                      padding: '12px 14px',
                      borderTop: '1px solid rgba(255,255,255,0.08)',
                      alignItems: 'center',
                      cursor: 'pointer',
                      background: highlight ?? (idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'),
                    }}
                  >
                    <div style={{ fontWeight: 950, color: '#e5e7eb' }}>{pos <= 3 ? `#${pos}` : pos}</div>

                    <div style={{ fontWeight: 950, color: '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.driver ?? 'Driver'}
                    </div>

                    <div style={{ textAlign: 'right', fontWeight: 900, color: '#e5e7eb' }}>{r.base_points}</div>
                    <div style={{ textAlign: 'right', fontWeight: 900, color: '#e5e7eb' }}>{r.bonus_points}</div>
                    <div style={{ textAlign: 'right', fontWeight: 900, color: '#e5e7eb' }}>{r.penalty_points}</div>

                    <div style={{ textAlign: 'right', fontWeight: 950, color: '#e5e7eb' }}>
                      {Number(r.season_points_counted ?? 0)}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </main>
    </>
  )
}





