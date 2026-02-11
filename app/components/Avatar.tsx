'use client'

import Image from 'next/image'
import { useState } from 'react'

export default function Avatar({
  srcJpg,
  srcPng,
  alt,
  size = 110,
  fallbackText = '?',
}: {
  srcJpg: string
  srcPng?: string
  alt: string
  size?: number
  fallbackText?: string
}) {
  const [src, setSrc] = useState(srcJpg)
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 16,
          background: '#fff',
          border: '1px solid #d7d7d7',
          boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
          display: 'grid',
          placeItems: 'center',
          fontWeight: 950,
          color: '#111',
          fontFamily: 'system-ui',
        }}
      >
        {fallbackText}
      </div>
    )
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid #d7d7d7',
        boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
        background: '#fff',
      }}
    >
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        priority
        onError={() => {
          if (srcPng && src !== srcPng) setSrc(srcPng)
          else setFailed(true)
        }}
      />
    </div>
  )
}
