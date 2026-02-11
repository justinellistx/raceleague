'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import SiteNav from '@/app/components/SiteNav'
import { supabase } from '@/lib/supabaseClient'

type StandingRow = {
  person_id: string
  driver: string | null
  season_points_counted: number | null
}

export default function StandingsPage() {
  const router = useRouter()

  const [rows, setRows] = useState<StandingRow[]>([])
  const [q, setQ] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setError(null)

      const { data, error: e } = await supabase
        .from('v_iracing_season_standings')
        .select('person_id, driver, season_points_counted')
        .order('season_points_counted', { ascending: false })

      if (e) {
        setError(e.message)
        return
      }

      setRows((data ?? []) as StandingRow[])
    }

    load()
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
          Season points • Click a driver to open profile
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

        {filtered.length === 0 && !error ? (
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
                    <div style={{ marginTop: 8, fontWeight: 950, fontSize: 18 }}>
                      {r.driver ?? 'Driver'}
                    </div>
                    <div className="subtle" style={{ marginTop: 6, fontWeight: 950 }}>
                      {Number(r.season_points_counted ?? 0)} pts
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
                    gridTemplateColumns: '80px 1fr 140px',
                    padding: '12px 14px',
                    fontWeight: 950,
                    color: '#e5e7eb',
                    letterSpacing: '0.04em',
                    fontSize: 12,
                  }}
                >
                  <div>POS</div>
                  <div>DRIVER</div>
                  <div style={{ textAlign: 'right' }}>POINTS</div>
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
                      gridTemplateColumns: '80px 1fr 140px',
                      padding: '12px 14px',
                      borderTop: '1px solid rgba(255,255,255,0.08)',
                      alignItems: 'center',
                      cursor: 'pointer',
                      background: highlight ?? (idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'),
                    }}
                  >
                    <div style={{ fontWeight: 950, color: '#e5e7eb' }}>
                      {pos <= 3 ? `#${pos}` : pos}
                    </div>

                    <div style={{ fontWeight: 950, color: '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.driver ?? 'Driver'}
                    </div>

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




