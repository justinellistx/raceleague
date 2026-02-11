'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'

type AvatarProps = {
  personId: string
  displayName?: string | null
  size?: number
  className?: string
  priority?: boolean
}

function initials(name?: string | null) {
  const n = (name ?? '').trim()
  if (!n) return '?'
  const parts = n.split(/\s+/).slice(0, 2)
  return parts.map(p => p[0]?.toUpperCase()).join('') || '?'
}

let cachedManifest: Record<string, string> | null = null

export default function Avatar({
  personId,
  displayName,
  size = 56,
  className = '',
  priority = false,
}: AvatarProps) {
  const [imgError, setImgError] = useState(false)
  const [manifest, setManifest] = useState<Record<string, string> | null>(cachedManifest)

  useEffect(() => {
    let cancelled = false
    if (manifest) return

    fetch('/drivers-photos/manifest.json', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : {}))
      .then((data) => {
        if (cancelled) return
        cachedManifest = data
        setManifest(data)
      })
      .catch(() => {
        if (cancelled) return
        cachedManifest = {}
        setManifest({})
      })

    return () => { cancelled = true }
  }, [manifest])

  const src = useMemo(() => {
    if (!manifest) return null
    return manifest[personId] ?? null
  }, [manifest, personId])

  const showImage = !!src && !imgError

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full ring-1 ring-white/10 bg-white/5 ${className}`}
      style={{ width: size, height: size }}
      aria-label={displayName ?? 'Driver'}
      title={displayName ?? 'Driver'}
    >
      {showImage ? (
        <Image
          src={src}
          alt={displayName ?? 'Driver avatar'}
          fill
          sizes={`${size}px`}
          priority={priority}
          onError={() => setImgError(true)}
          className="object-cover"
          quality={95}

        />
      ) : (
        <div className="grid h-full w-full place-items-center text-white/80 font-semibold">
          <span style={{ fontSize: Math.max(12, Math.floor(size * 0.35)) }}>
            {initials(displayName)}
          </span>
        </div>
      )}
    </div>
  )
}


