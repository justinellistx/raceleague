'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function StandingsOverlay() {
  const [rows, setRows] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState('CHAMPIONSHIP STANDINGS')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setError(null)

      const { data, error } = await supabase
        .from('v_iracing_season_standings')
        .select('*')
        .order('season_points_counted', { ascending: false })
        .limit(15)

      if (cancelled) return

      if (error) {
        setError(error.message)
        setRows([])
        setTitle('STANDINGS UNAVAILABLE')
      } else {
        setRows(data ?? [])
        setTitle('CHAMPIONSHIP STANDINGS')
      }
    }

    load()
    const id = setInterval(load, 3000)

    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return (
    <div
      style={{
        width: 520,
        padding: 16,
        color: 'white',
        fontFamily: 'system-ui',
      }}
    >
      {/* Panel */}
      <div
        style={{
          borderRadius: 14,
          background: 'rgba(10, 10, 12, 0.78)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            background: 'rgba(255,255,255,0.06)',
            borderBottom: '1px solid rgba(255,255,255,0.10)',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 0.8 }}>
            {title}
          </div>

          <div
            style={{
              fontSize: 11,
              opacity: 0.85,
              padding: '4px 8px',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(0,0,0,0.25)',
              whiteSpace: 'nowrap',
            }}
          >
            AUTO REFRESH • 3s
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            style={{
              padding: 12,
              margin: 12,
              borderRadius: 10,
              border: '1px solid rgba(255,80,80,0.45)',
              background: 'rgba(255,80,80,0.10)',
              fontSize: 12,
            }}
          >
            Error: {error}
          </div>
        )}

        {/* Table */}
        <div style={{ padding: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', fontSize: 11, opacity: 0.85 }}>
                <th style={{ padding: '8px 6px', width: 52 }}>POS</th>
                <th style={{ padding: '8px 6px' }}>DRIVER</th>
                <th style={{ padding: '8px 6px', width: 90, textAlign: 'right' }}>
                  PTS
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.person_id ?? `${r.display_name}-${i}`}
                  style={{
                    fontSize: 13,
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <td style={{ padding: '9px 6px', fontWeight: 800 }}>
                    {i + 1}
                  </td>
                  <td
                    style={{
                      padding: '9px 6px',
                      fontWeight: 700,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: 320,
                    }}
                    title={r.display_name ?? 'Unknown'}
                  >
                    {r.display_name ?? 'Unknown'}
                  </td>
                  <td
                    style={{
                      padding: '9px 6px',
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 800,
                    }}
                  >
                    {r.season_points_counted ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!error && rows.length === 0 && (
            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
              No standings yet (no scored races in the active season).
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
