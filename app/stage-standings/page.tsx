'use client'

import Link from 'next/link'
import SiteNav from '@/app/components/SiteNav'

export default function StageStandingsIndexPage() {
  return (
    <>
      <SiteNav />

      <main className="container">
        <h1 className="h1" style={{ marginBottom: 8 }}>
          Stage Standings
        </h1>
        <div className="subtle" style={{ marginBottom: 16 }}>
          Choose a leaderboard to view stage points.
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 12,
          }}
        >
          <Link
            href="/stage-standings/drivers"
            className="card cardPad"
            style={{
              textDecoration: 'none',
              color: '#e5e7eb',
              display: 'block',
            }}
          >
            <div style={{ fontWeight: 950, fontSize: 16 }}>Driver Stage Standings</div>
            <div className="subtle" style={{ marginTop: 8 }}>
              Points by stage for human drivers
            </div>
            <div style={{ marginTop: 12, fontWeight: 950 }}>View →</div>
          </Link>

          <Link
            href="/stage-standings/teams"
            className="card cardPad"
            style={{
              textDecoration: 'none',
              color: '#e5e7eb',
              display: 'block',
            }}
          >
            <div style={{ fontWeight: 950, fontSize: 16 }}>Team Stage Standings</div>
            <div className="subtle" style={{ marginTop: 8 }}>
              Points by stage for teams
            </div>
            <div style={{ marginTop: 12, fontWeight: 950 }}>View →</div>
          </Link>
        </div>
      </main>
    </>
  )
}

