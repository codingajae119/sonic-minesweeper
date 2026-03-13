import { useEffect, useRef, useState } from 'react'
import type { GameState } from '../../types'

interface HeaderProps {
  state: GameState
  onClearPenalty: () => void
  onToggleVisualAssist: () => void
}

export function Header({ state, onClearPenalty, onToggleVisualAssist }: HeaderProps) {
  const { remainingTime, wrongCount, baseScore, wrongDeduction, flaggedCount, difficulty,
    isAudioPlaying, pendingTimePenalty, visualAssist } = state
  const [showPenalty, setShowPenalty] = useState(false)
  const penaltyRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (pendingTimePenalty !== null) {
      setShowPenalty(true)
      penaltyRef.current = setTimeout(() => {
        setShowPenalty(false)
        onClearPenalty()
      }, 800)
    }
    return () => {
      if (penaltyRef.current) clearTimeout(penaltyRef.current)
    }
  }, [pendingTimePenalty, onClearPenalty])

  const timeDisplay = remainingTime.toFixed(1) + 's'
  const isLow = remainingTime <= 10
  const isUrgent = remainingTime <= 5
  const currentScore = baseScore - wrongDeduction
  const mineCount = difficulty?.mineCount ?? 0

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 20,
      backgroundColor: '#13131f',
      padding: '8px 12px',
      borderBottom: '1px solid #3a3a5e',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Timer */}
        <div style={{ position: 'relative' }}>
          <span
            className={isLow ? 'animate-blink' : ''}
            style={{
              fontSize: '1.4em',
              fontWeight: 'bold',
              color: isLow ? '#ef4444' : '#e2e8f0',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            ⏱ {timeDisplay}
          </span>
          {showPenalty && pendingTimePenalty !== null && (
            <span
              className="animate-float-up"
              style={{
                position: 'absolute',
                top: -20,
                left: '50%',
                transform: 'translateX(-50%)',
                color: '#ef4444',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              −{pendingTimePenalty}s
            </span>
          )}
        </div>

        {/* Score */}
        <div style={{ fontSize: '1.1em', color: '#a78bfa' }}>
          {currentScore} pts
        </div>

        {/* Audio indicator */}
        <div
          className={isAudioPlaying ? 'animate-vibrate' : ''}
          style={{ fontSize: '1.2em', width: 24, textAlign: 'center' }}
        >
          {isAudioPlaying ? '🔊' : '🔈'}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Lives */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className={i === wrongCount - 1 ? 'animate-shake' : ''}
              style={{ fontSize: '1.1em', opacity: i < wrongCount ? 0.3 : 1 }}
            >
              ❤️
            </span>
          ))}
        </div>

        {/* Mine progress */}
        <div style={{ color: '#94a3b8', fontSize: '0.9em' }}>
          🎯 {flaggedCount}/{mineCount}
        </div>

        {/* Visual assist toggle */}
        <button
          onClick={onToggleVisualAssist}
          style={{
            background: 'none',
            border: '1px solid #3a3a5e',
            borderRadius: 4,
            color: visualAssist ? '#6366f1' : '#94a3b8',
            cursor: 'pointer',
            fontSize: '0.75em',
            padding: '2px 6px',
          }}
          title="Toggle visual assist"
        >
          👁
        </button>
      </div>

      {/* Time progress bar */}
      {difficulty && (
        <div style={{ height: 3, backgroundColor: '#2a2a3e', borderRadius: 2 }}>
          <div
            className={isUrgent ? 'animate-blink' : ''}
            style={{
              height: '100%',
              width: `${(remainingTime / difficulty.timeBudget) * 100}%`,
              backgroundColor: isLow ? '#ef4444' : '#6366f1',
              borderRadius: 2,
              transition: 'width 0.1s linear',
            }}
          />
        </div>
      )}
    </header>
  )
}
