import { memo, useState, useCallback, useRef, useEffect } from 'react'
import { useLongPress } from '../../hooks/useLongPress'
import { SoundWave } from '../SoundWave/SoundWave'
import type { Cell as CellType } from '../../types'

interface CellProps {
  cell: CellType
  isExploring: boolean
  visualAssist: boolean
  adjacentMineCount: number
  volumeLevel: number
  detectionRadiusPx: number
  disabled: boolean
  onTap: (row: number, col: number) => void
  onLongPressActivate: (row: number, col: number) => void
  onLongPressRelease: (row: number, col: number) => void
}

function cellsAreEqual(prev: CellProps, next: CellProps): boolean {
  return (
    prev.cell.state === next.cell.state &&
    prev.isExploring === next.isExploring &&
    prev.visualAssist === next.visualAssist &&
    prev.adjacentMineCount === next.adjacentMineCount &&
    prev.volumeLevel === next.volumeLevel &&
    prev.disabled === next.disabled &&
    prev.onTap === next.onTap &&
    prev.onLongPressActivate === next.onLongPressActivate &&
    prev.onLongPressRelease === next.onLongPressRelease
  )
}

export const Cell = memo(function Cell({
  cell,
  isExploring,
  visualAssist,
  adjacentMineCount,
  volumeLevel,
  detectionRadiusPx,
  disabled,
  onTap,
  onLongPressActivate,
  onLongPressRelease,
}: CellProps) {
  const [pressProgress, setPressProgress] = useState(0)
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isActivatedRef = useRef(false)

  const startProgress = useCallback(() => {
    isActivatedRef.current = false
    const startTime = Date.now()
    progressIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 500
      setPressProgress(Math.min(elapsed, 1))
      if (elapsed >= 1) {
        isActivatedRef.current = true
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
          progressIntervalRef.current = null
        }
      }
    }, 16)
  }, [])

  const stopProgress = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    setPressProgress(0)
  }, [])

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    }
  }, [])

  const handleTap = useCallback(() => {
    onTap(cell.row, cell.col)
  }, [onTap, cell.row, cell.col])

  const handleLongPressActivate = useCallback(() => {
    onLongPressActivate(cell.row, cell.col)
  }, [onLongPressActivate, cell.row, cell.col])

  const handleLongPressRelease = useCallback(() => {
    stopProgress()
    onLongPressRelease(cell.row, cell.col)
  }, [onLongPressRelease, stopProgress, cell.row, cell.col])

  const pressHandlers = useLongPress({
    onTap: handleTap,
    onLongPressActivate: handleLongPressActivate,
    onLongPressRelease: handleLongPressRelease,
    disabled,
  })

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      startProgress()
      pressHandlers.onPointerDown(e)
    },
    [startProgress, pressHandlers],
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isActivatedRef.current) stopProgress()
      pressHandlers.onPointerUp(e)
    },
    [stopProgress, pressHandlers],
  )

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent) => {
      stopProgress()
      pressHandlers.onPointerLeave(e)
    },
    [stopProgress, pressHandlers],
  )

  const handlePointerCancel = useCallback(
    (e: React.PointerEvent) => {
      stopProgress()
      pressHandlers.onPointerCancel(e)
    },
    [stopProgress, pressHandlers],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return
      if (e.key === 'Enter') {
        e.preventDefault()
        onTap(cell.row, cell.col)
      }
    },
    [disabled, onTap, cell.row, cell.col],
  )

  const { state } = cell
  const circumference = 2 * Math.PI * 18
  const strokeDashoffset = circumference * (1 - pressProgress)

  let bgColor = '#2a2a3e'
  let content: React.ReactNode = null
  let animClass = ''

  if (state === 'flagged') {
    bgColor = '#16532d'
    animClass = 'animate-pulse-scale'
    content = (
      <span style={{ fontSize: '1.2em' }}>
        {visualAssist && adjacentMineCount > 0 ? (
          <span style={{ fontSize: '0.9em', fontWeight: 'bold', color: '#4ade80' }}>
            {adjacentMineCount}
          </span>
        ) : '✓'}
      </span>
    )
  } else if (state === 'wrong') {
    bgColor = '#7f1d1d'
    animClass = 'animate-shake'
    content = <span style={{ color: '#f87171' }}>✗</span>
  } else if (state === 'revealed-mine') {
    bgColor = '#451a03'
    content = <span style={{ fontSize: '1em' }}>💣</span>
  }

  // Intensity color during exploration
  if (isExploring && state === 'hidden') {
    const intensity = Math.round(volumeLevel * 100)
    bgColor = `color-mix(in srgb, #6366f1 ${intensity}%, #2a2a3e)`
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={`Cell ${cell.row}-${cell.col}${state !== 'hidden' ? ` ${state}` : ''}`}
      aria-pressed={state === 'flagged'}
      className={animClass}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minWidth: 44,
        minHeight: 44,
        backgroundColor: bgColor,
        border: '1px solid #3a3a5e',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'default' : 'pointer',
        touchAction: 'none',
        fontSize: '1.4em',
        transition: 'background-color 0.1s',
        outline: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerCancel}
      onKeyDown={handleKeyDown}
    >
      {/* Progress ring */}
      {pressProgress > 0 && (
        <svg
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
          viewBox="0 0 40 40"
        >
          <circle
            cx="20"
            cy="20"
            r="18"
            fill="none"
            stroke="#6366f1"
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 20 20)"
          />
        </svg>
      )}

      {content}

      {/* Sound wave ripple during exploration */}
      {isExploring && (
        <SoundWave volumeLevel={volumeLevel} radiusPx={detectionRadiusPx} />
      )}
    </div>
  )
},
cellsAreEqual)
