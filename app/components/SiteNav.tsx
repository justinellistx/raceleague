'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const linkStyle: React.CSSProperties = {
  color: '#111',
  textDecoration: 'underline',
  fontWeight: 900,
}

export default function SiteNav() {
  const pathname = usePathname()

  const Item = ({ href, label }: { href: string; label: string }) => (
    <Link
      href={href}
      style={{
        ...linkStyle,
        opacity: pathname === href ? 0.65 : 1,
      }}
    >
      {label}
    </Link>
  )

  return (
    <div
      style={{
        display: 'flex',
        gap: 14,
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 14,
      }}
    >
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <Item href="/" label="Home" />
        <Item href="/standings" label="Standings" />
        <Item href="/races" label="Races" />
        <Item href="/drivers" label="Drivers" />
        <Item href="/teams" label="Teams" />
      </div>

      {/* Optional: keep admin/control stuff visible but separate */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <Item href="/control-room" label="Control Room" />
      </div>
    </div>
  )
}
