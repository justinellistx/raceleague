'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function SiteNav() {
  const pathname = usePathname()

  const NavItem = ({ href, label }: { href: string; label: string }) => {
    const active =
      pathname === href ||
      (href !== '/' && pathname.startsWith(href))

    return (
      <Link
        href={href}
        style={{
          padding: '8px 14px',
          borderRadius: 12,
          textDecoration: 'none',
          fontWeight: 900,
          fontSize: 14,
          transition: 'all 0.15s ease',
          background: active ? 'rgba(17,24,39,0.08)' : 'transparent',
          border: active ? '1px solid rgba(17,24,39,0.15)' : '1px solid transparent',
          color: '#111827',
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
        backdropFilter: 'blur(8px)',
        background: 'rgba(246,247,249,0.9)',
        borderBottom: '1px solid rgba(17,24,39,0.08)',
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        {/* Left: Brand + Main Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <Link
            href="/"
            style={{
              textDecoration: 'none',
              fontWeight: 950,
              fontSize: 16,
              letterSpacing: '-0.02em',
              color: '#111827',
            }}
          >
            RaceLeague
          </Link>

          <NavItem href="/standings" label="Season" />
          <NavItem href="/stage-standings" label="Stage" />
          <NavItem href="/races" label="Races" />
          <NavItem href="/drivers" label="Drivers" />
          <NavItem href="/teams" label="Teams" />
        </div>

        {/* Right: Admin */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            href="/control-room"
            style={{
              padding: '8px 14px',
              borderRadius: 12,
              textDecoration: 'none',
              fontWeight: 900,
              fontSize: 13,
              border: '1px solid rgba(17,24,39,0.15)',
              background: '#111827',
              color: '#fff',
            }}
          >
            Control Room
          </Link>
        </div>
      </div>
    </div>
  )
}
