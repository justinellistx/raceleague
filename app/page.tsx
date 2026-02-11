'use client'

import Link from 'next/link'
import SiteNav from '@/app/components/SiteNav'

export default function HomePage() {
  return (
    <>
      <SiteNav />

      <main className="container">
        <div className="card cardPad" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h1 className="h1" style={{ marginBottom: 6 }}>
                RaceLeague Broadcast + Stats
              </h1>
              <div className="subtle">
                Live standings, driver/team profiles, and race results. (Preseason safe)
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span className="badge badgeBlue">PUBLIC</span>
              <span className="badge badgeAccent">HUMANS ONLY</span>
            </div>
          </div>
        </div>

        <div className="gridAuto">
          <Link
            href="/standings"
            className="card cardPad"
            style={{ textDecoration: 'none', color: '#e5e7eb', display: 'block' }}
          >
            <div style={{ fontWeight: 950, fontSize: 16 }}>Season Standings</div>
            <div className="subtle" style={{ marginTop: 8 }}>
              Championship points leaderboard
            </div>
            <div style={{ marginTop: 12, fontWeight: 950 }}>View →</div>
          </Link>

          <Link
            href="/stage-standings"
            className="card cardPad"
            style={{ textDecoration: 'none', color: '#e5e7eb', display: 'block' }}
          >
            <div style={{ fontWeight: 950, fontSize: 16 }}>Stage Standings</div>
            <div className="subtle" style={{ marginTop: 8 }}>
              Drivers + teams by stage points
            </div>
            <div style={{ marginTop: 12, fontWeight: 950 }}>View →</div>
          </Link>

          <Link
            href="/races"
            className="card cardPad"
            style={{ textDecoration: 'none', color: '#e5e7eb', display: 'block' }}
          >
            <div style={{ fontWeight: 950, fontSize: 16 }}>Race Schedule & Results</div>
            <div className="subtle" style={{ marginTop: 8 }}>
              Events, tracks, and race result links
            </div>
            <div style={{ marginTop: 12, fontWeight: 950 }}>View →</div>
          </Link>

          <Link
            href="/drivers"
            className="card cardPad"
            style={{ textDecoration: 'none', color: '#e5e7eb', display: 'block' }}
          >
            <div style={{ fontWeight: 950, fontSize: 16 }}>Drivers</div>
            <div className="subtle" style={{ marginTop: 8 }}>
              Human driver profiles + stats
            </div>
            <div style={{ marginTop: 12, fontWeight: 950 }}>View →</div>
          </Link>

          <Link
            href="/teams"
            className="card cardPad"
            style={{ textDecoration: 'none', color: '#e5e7eb', display: 'block' }}
          >
            <div style={{ fontWeight: 950, fontSize: 16 }}>Teams</div>
            <div className="subtle" style={{ marginTop: 8 }}>
              Rosters + team standings
            </div>
            <div style={{ marginTop: 12, fontWeight: 950 }}>View →</div>
          </Link>
        </div>

        <div style={{ marginTop: 14 }} className="subtle">
          Tip: bookmark your OBS overlays separately — this site is focused on league viewing.
        </div>
      </main>
    </>
  )
}




