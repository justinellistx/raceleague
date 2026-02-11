import Link from 'next/link'
import SiteNav from '@/app/components/SiteNav'

export default function HomePage() {
  return (
    <>
      <SiteNav />
      <main
        style={{
          padding: 24,
          fontFamily: 'system-ui',
          color: '#111',
          background: '#f6f7f9',
          minHeight: '100vh',
        }}
      >
        <div style={{ maxWidth: 980, margin: '0 auto' }}>
          <h1 style={{ fontSize: 34, fontWeight: 950, marginBottom: 6 }}>Race League Hub</h1>
          <div style={{ color: '#374151', fontWeight: 700, marginBottom: 18 }}>
            Standings • Drivers • Teams • Results
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 12,
            }}
          >
            <HomeCard href="/standings" title="Season Standings" desc="Overall points (preseason ready)." />
            <HomeCard href="/drivers" title="Drivers" desc="Human driver profiles." />
            <HomeCard href="/teams" title="Teams" desc="Team rosters + standings." />
            <HomeCard href="/races" title="Races" desc="Schedule, results, and race pages." />
            <HomeCard href="/stage-standings" title="Stage Standings" desc="Driver stage points leaderboard." />
            <HomeCard href="/stage-standings/teams" title="Team Stage Standings" desc="Team stage points leaderboard." />
          </div>

          <div style={{ marginTop: 18, fontSize: 13, color: '#6b7280', fontWeight: 700 }}>
            Preseason note: some pages may show “No data yet” until races begin.
          </div>
        </div>
      </main>
    </>
  )
}

function HomeCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: 'none',
        color: '#111',
        border: '1px solid #e5e7eb',
        borderRadius: 14,
        padding: 16,
        background: '#fff',
        boxShadow: '0 6px 16px rgba(0,0,0,0.06)',
        display: 'block',
      }}
    >
      <div style={{ fontSize: 16, fontWeight: 950, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#374151', fontWeight: 700 }}>{desc}</div>
      <div style={{ marginTop: 10, fontSize: 12, color: '#111', fontWeight: 900 }}>Open →</div>
    </Link>
  )
}



