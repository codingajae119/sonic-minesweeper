import { memo } from 'react'

interface SoundWaveProps {
  volumeLevel: number // 0–1
  radiusPx: number
}

export const SoundWave = memo(function SoundWave({ volumeLevel, radiusPx }: SoundWaveProps) {
  const saturate = Math.round(volumeLevel * 100)

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: radiusPx * 2,
        height: radiusPx * 2,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '2px solid #6366f1',
            filter: `saturate(${saturate}%)`,
            animation: `ripple-expand 1.5s ease-out ${i * 0.5}s infinite`,
          }}
        />
      ))}
    </div>
  )
})
