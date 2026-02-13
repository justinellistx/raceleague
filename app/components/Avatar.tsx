'use client'

type AvatarProps = {
  personId: string
  displayName?: string | null
  size?: number
  className?: string
  badgeText?: string
}

function initials(name?: string | null) {
  const n = (name ?? '').trim()
  if (!n) return '?'
  const parts = n.split(/\s+/).slice(0, 2)
  return parts.map((p) => (p[0] ? p[0].toUpperCase() : '')).join('') || '?'
}

export default function Avatar({
  personId, // keep even if unused (or prefix with _personId)
  displayName,
  size = 40,
  className = '',
  badgeText,
}: AvatarProps) {
  void personId // prevents “unused” warnings if you have strict linting

  const init = initials(displayName)

  // Broadcast-y sizing
  const fontSize = Math.max(12, Math.floor(size * 0.42))
  const badgeSize = Math.max(16, Math.floor(size * 0.42))

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        position: 'relative',
        borderRadius: 14,
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.14)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
      }}
      aria-label={displayName ?? 'Driver'}
      title={displayName ?? 'Driver'}
    >
      {/* Glow + top sheen */}
      <div
        style={{
          position: 'absolute',
          inset: -18,
          background:
            'radial-gradient(60% 60% at 30% 20%, rgba(96,165,250,0.35), transparent 60%), radial-gradient(50% 50% at 80% 70%, rgba(34,197,94,0.22), transparent 60%)',
          filter: 'blur(10px)',
          opacity: 0.9,
          pointerEvents: 'none',
        }}
      />

      {/* Scanlines */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'repeating-linear-gradient(to bottom, rgba(255,255,255,0.06), rgba(255,255,255,0.06) 1px, transparent 1px, transparent 4px)',
          opacity: 0.25,
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
        }}
      />

      {/* Angled corner cuts (broadcast plate) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          clipPath:
            'polygon(10% 0%, 100% 0%, 100% 90%, 90% 100%, 0% 100%, 0% 10%)',
          border: '1px solid rgba(255,255,255,0.12)',
          pointerEvents: 'none',
        }}
      />

      {/* Main initials */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          fontWeight: 950,
          fontSize,
          letterSpacing: '0.06em',
          color: 'rgba(229,231,235,0.92)',
          textShadow: '0 2px 16px rgba(0,0,0,0.65)',
        }}
      >
        {init}
      </div>

      {/* Lower-third strip */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: Math.max(12, Math.floor(size * 0.30)),
          background:
            'linear-gradient(90deg, rgba(96,165,250,0.30), rgba(255,255,255,0.06) 55%, rgba(34,197,94,0.20))',
          borderTop: '1px solid rgba(255,255,255,0.14)',
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 8,
          paddingRight: 8,
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 950,
            color: 'rgba(229,231,235,0.92)',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
          }}
        >
          DRIVER
        </span>

        <span style={{ flex: 1 }} />

        {/* Optional badge */}
        {badgeText ? (
          <span
            style={{
              minWidth: badgeSize,
              height: badgeSize,
              display: 'grid',
              placeItems: 'center',
              padding: '0 8px',
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 950,
              letterSpacing: '0.10em',
              color: '#e5e7eb',
              border: '1px solid rgba(96,165,250,0.40)',
              background: 'rgba(96,165,250,0.18)',
            }}
          >
            {badgeText}
          </span>
        ) : null}
      </div>
    </div>
  )
}



