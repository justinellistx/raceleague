'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import SiteNav from '@/app/components/SiteNav'

type EventRow = {
  id: string
  name: string | null
  race_number: number | null
  stage_number: number | null
}

type Person = { id: string; display_name: string | null }

type ResultRow = {
  driver_id: string
  finish_position: number | null
  race_points: number | string | null
  bonus_points: number | string | null
  penalty_points: number | string | null
  total_points: number | string | null
}

// In-race stage caution: top 5 score 5/4/3/2/1
const STAGE_POINTS = [5, 4, 3, 2, 1]
const num = (x: unknown) => {
  const v = typeof x === 'string' ? parseFloat(x) : (x as number)
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

export default function StagePointsEntry() {
  const [races, setRaces] = useState<EventRow[]>([])
  const [drivers, setDrivers] = useState<Person[]>([])
  const [raceId, setRaceId] = useState<string>('')

  // picks[stage][position] = driverId ('' = none)
  const [stage1, setStage1] = useState<string[]>(['', '', '', '', ''])
  const [stage2, setStage2] = useState<string[]>(['', '', '', '', ''])

  const [results, setResults] = useState<ResultRow[]>([])
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const driverName = useMemo(() => {
    const m = new Map<string, string>()
    for (const d of drivers) m.set(d.id, d.display_name ?? 'Unknown')
    return m
  }, [drivers])

  // Load Stage 2 races + drivers once
  useEffect(() => {
    const load = async () => {
      const [{ data: ev }, { data: ppl }] = await Promise.all([
        supabase.from('events').select('id, name, race_number, stage_number').eq('stage_number', 2).order('race_number', { ascending: true }),
        supabase.from('people').select('id, display_name').order('display_name', { ascending: true }),
      ])
      setRaces((ev ?? []) as EventRow[])
      setDrivers((ppl ?? []) as Person[])
    }
    load()
  }, [])

  // When a race is selected, load any existing stage results + current scored results
  useEffect(() => {
    if (!raceId) {
      setStage1(['', '', '', '', ''])
      setStage2(['', '', '', '', ''])
      setResults([])
      return
    }
    const load = async () => {
      setMsg(null)
      const { data: sr } = await supabase
        .from('race_stage_results')
        .select('stage_number, position, driver_id')
        .eq('race_id', raceId)

      const s1 = ['', '', '', '', '']
      const s2 = ['', '', '', '', '']
      for (const row of (sr ?? []) as { stage_number: number; position: number; driver_id: string }[]) {
        const idx = row.position - 1
        if (idx < 0 || idx > 4) continue
        if (row.stage_number === 1) s1[idx] = row.driver_id
        else if (row.stage_number === 2) s2[idx] = row.driver_id
      }
      setStage1(s1)
      setStage2(s2)
      await loadResults()
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raceId])

  const loadResults = async () => {
    if (!raceId) return
    const { data } = await supabase
      .from('race_results')
      .select('driver_id, finish_position, race_points, bonus_points, penalty_points, total_points')
      .eq('race_id', raceId)
      .order('finish_position', { ascending: true })
    setResults((data ?? []) as ResultRow[])
  }

  const setPick = (stage: 1 | 2, posIdx: number, value: string) => {
    if (stage === 1) setStage1((p) => p.map((v, i) => (i === posIdx ? value : v)))
    else setStage2((p) => p.map((v, i) => (i === posIdx ? value : v)))
  }

  const save = async () => {
    if (!raceId) {
      setMsg({ kind: 'err', text: 'Pick a race first.' })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      const rows: { race_id: string; stage_number: number; position: number; driver_id: string; points: number }[] = []
      stage1.forEach((d, i) => { if (d) rows.push({ race_id: raceId, stage_number: 1, position: i + 1, driver_id: d, points: STAGE_POINTS[i] }) })
      stage2.forEach((d, i) => { if (d) rows.push({ race_id: raceId, stage_number: 2, position: i + 1, driver_id: d, points: STAGE_POINTS[i] }) })

      // Replace existing stage results for this race
      const del = await supabase.from('race_stage_results').delete().eq('race_id', raceId)
      if (del.error) throw del.error
      if (rows.length) {
        const ins = await supabase.from('race_stage_results').insert(rows)
        if (ins.error) throw ins.error
      }

      // Recompute Stage 2 scoring for this race (finish + bonuses + stage points + penalty)
      const rpc = await supabase.rpc('lsrl_recompute_stage2_race', { p_race_id: raceId })
      if (rpc.error) throw rpc.error

      await loadResults()
      setMsg({ kind: 'ok', text: `Saved ${rows.length} stage entr${rows.length === 1 ? 'y' : 'ies'} and rescored the race.` })
    } catch (e: unknown) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Save failed' })
    } finally {
      setSaving(false)
    }
  }

  const selStyle: React.CSSProperties = {
    width: '100%', padding: 10, borderRadius: 10, color: '#e5e7eb',
    border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)',
  }

  const StageColumn = ({ title, picks, stage }: { title: string; picks: string[]; stage: 1 | 2 }) => (
    <div className="card cardPad" style={{ flex: 1, minWidth: 280 }}>
      <div style={{ fontWeight: 950, marginBottom: 4 }}>{title}</div>
      <div className="subtle" style={{ marginBottom: 12 }}>Top 5 earn +5 / +4 / +3 / +2 / +1</div>
      {picks.map((val, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
          <div style={{ width: 64, fontWeight: 900 }}>P{i + 1} (+{STAGE_POINTS[i]})</div>
          <select style={selStyle} value={val} onChange={(e) => setPick(stage, i, e.target.value)}>
            <option value="">— none —</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>{d.display_name ?? 'Unknown'}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )

  return (
    <>
      <SiteNav />
      <main className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 className="h1" style={{ marginBottom: 6 }}>Stage Points Entry</h1>
            <div className="subtle">Enter in-race Stage 1 &amp; Stage 2 caution top-5s for a Stage 2 race. Finish points are computed automatically.</div>
          </div>
          <Link href="/control-room" style={{ textDecoration: 'none', fontWeight: 950, padding: '10px 12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', color: '#e5e7eb' }}>← Control Room</Link>
        </div>

        <div className="card cardPad" style={{ marginTop: 16, marginBottom: 16 }}>
          <label className="subtle" style={{ fontWeight: 950 }}>Race</label>
          <select style={{ ...selStyle, marginTop: 6 }} value={raceId} onChange={(e) => setRaceId(e.target.value)}>
            <option value="">— select a Stage 2 race —</option>
            {races.map((r) => (
              <option key={r.id} value={r.id}>
                Race {String(r.race_number ?? 0).padStart(2, '0')} — {r.name ?? 'TBD'}
              </option>
            ))}
          </select>
        </div>

        {raceId && (
          <>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
              <StageColumn title="Stage 1 caution" picks={stage1} stage={1} />
              <StageColumn title="Stage 2 caution" picks={stage2} stage={2} />
            </div>

            <button
              onClick={save}
              disabled={saving}
              style={{
                padding: '12px 18px', borderRadius: 12, fontWeight: 950, cursor: saving ? 'default' : 'pointer',
                border: '1px solid rgba(96,165,250,0.6)', background: 'rgba(96,165,250,0.18)', color: '#e5e7eb',
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save stage points & rescore race'}
            </button>

            {msg && (
              <div className="card cardPad" style={{ marginTop: 14, borderColor: msg.kind === 'ok' ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.35)', background: msg.kind === 'ok' ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)' }}>
                {msg.text}
              </div>
            )}

            {results.length > 0 && (
              <div className="card" style={{ overflow: 'hidden', borderRadius: 16, marginTop: 16 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th className="th">Fin</th>
                      <th className="th">Driver</th>
                      <th className="th" style={{ textAlign: 'right' }}>Finish</th>
                      <th className="th" style={{ textAlign: 'right' }}>Bonus (incl. stage)</th>
                      <th className="th" style={{ textAlign: 'right' }}>Penalty</th>
                      <th className="th" style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.driver_id} className="rowHover">
                        <td className="td" style={{ fontWeight: 900 }}>{r.finish_position ?? '—'}</td>
                        <td className="td" style={{ fontWeight: 900 }}>{driverName.get(r.driver_id) ?? 'Unknown'}</td>
                        <td className="td" style={{ textAlign: 'right' }}>{num(r.race_points)}</td>
                        <td className="td" style={{ textAlign: 'right' }}>{num(r.bonus_points)}</td>
                        <td className="td" style={{ textAlign: 'right' }}>{num(r.penalty_points)}</td>
                        <td className="td" style={{ textAlign: 'right', fontWeight: 950 }}>{num(r.total_points)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </>
  )
}
