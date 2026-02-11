'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function SiteNav() {
  const pathname = usePathname()

  const activeMatch = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href))

  const NavItem = ({ href, label }: { href: string; label: string }) => {
    const active = activeMatch(href)

    return (
      <Link
        href={href}
        style={{
          padding: '10px 14px',
          borderRadius: 999,
          textDecoration: 'none',
          fontWeight: 950,
          fontSize: 13,
          letterSpacing: '0.02em',
          transition: 'all 0.15s ease',
          border: active ? '1px solid rgba(96,165,250,0.55)' : '1px solid rgba(255,255,255,0.12)',
          background: active
            ? 'linear-gradient(180deg, rgba(96,165,250,0.18), rgba(96,165,250,0.06))'
            : 'rgba(255,255,255,0.04)',
          color: '#e5e7eb',
          boxShadow: active ? '0 10px 22px rgba(0,0,0,0.35)' : 'none',
        }}
      >
        {label}
      </Link>
    )
  }

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background:
          'linear-gradient(180deg, rgba(3,6,12,0.92), rgba(3,6,12,0.72))',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.10)',
      }}
    >
      {/* top accent line */}
      <div
        style={{
          height: 3,
          background:
            'linear-gradient(90deg, rgba(34,197,94,0.9), rgba(96,165,250,0.9), rgba(239,68,68,0.85))',
        }}
      />

      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 18,
          flexWrap: 'wrap',
        }}
      >
        {/* Brand cluster */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <Link
            href="/"
            style={{
              textDecoration: 'none',
              color: '#e5e7eb',
              fontWeight: 1000 as any,
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: 'rgba(34,197,94,0.95)',
                boxShadow: '0 0 18px rgba(34,197,94,0.55)',
              }}
            />
            <span style={{ fontSize: 16 }}>RaceLeague</span>
          </Link>

          {/* “LIVE” pill (pure vibe, not functional) */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 10px',
              borderRadius: 999,
              border: '1px solid rgba(239,68,68,0.35)',
              background: 'rgba(239,68,68,0.10)',
              color: '#fecaca',
              fontWeight: 950,
              fontSize: 11,
              letterSpacing: '0.08em',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: 'rgba(239,68,68,0.95)',
                boxShadow: '0 0 12px rgba(239,68,68,0.55)',
              }}
            />
            LIVE
          </span>

          <div style={{ width: 1, height: 26, background: 'rgba(255,255,255,0.12)' }} />
          <NavItem href="/standings" label="SEASON" />
          <NavItem href="/stage-standings" label="STAGE" />
          <NavItem href="/races" label="RACES" />
          <NavItem href="/drivers" label="DRIVERS" />
          <NavItem href="/teams" label="TEAMS" />
        </div>

        {/* Admin */}
        <Link
          href="/control-room"
          style={{
            padding: '10px 14px',
            borderRadius: 999,
            textDecoration: 'none',
            fontWeight: 950,
            fontSize: 12,
            letterSpacing: '0.06em',
            border: '1px solid rgba(255,255,255,0.14)',
            background: 'rgba(255,255,255,0.06)',
            color: '#e5e7eb',
          }}
        >
          CONTROL ROOM
        </Link>
      </div>
    </div>
  )
}

