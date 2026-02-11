import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ padding: 32, fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: 34, fontWeight: 900 }}>iRacing League Hub</h1>
      <p style={{ color: '#666', marginTop: 8 }}>Local dev running correctly.</p>

      <div style={{ display: 'grid', gap: 10, marginTop: 20, maxWidth: 420 }}>
        <Link href="/standings">🏆 Championship Standings</Link>
        <Link href="/races">🗓 Race Schedule & Results</Link>
        <Link href="/control-room">🎛 Control Room</Link>
        <Link href="/overlay/leaderboard">📺 Overlay: Live Leaderboard</Link>
      </div>
    </main>
  )
}


