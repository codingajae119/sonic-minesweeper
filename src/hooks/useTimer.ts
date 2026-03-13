import { useEffect, useRef } from 'react'
import type { GameAction, GamePhase } from '../types'

const MAX_DELTA = 0.1 // clamp deltaTime to 100ms to handle tab-resume spikes

export function useTimer(phase: GamePhase, dispatch: React.Dispatch<GameAction>) {
  const rafRef = useRef<number | null>(null)
  const prevTsRef = useRef<number | null>(null)

  useEffect(() => {
    if (phase !== 'playing') {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
        prevTsRef.current = null
      }
      return
    }

    const tick = (ts: number) => {
      if (prevTsRef.current === null) {
        prevTsRef.current = ts
      }
      const deltaTime = Math.min((ts - prevTsRef.current) / 1000, MAX_DELTA)
      prevTsRef.current = ts
      dispatch({ type: 'TICK', deltaTime })
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
        prevTsRef.current = null
      }
    }
  }, [phase, dispatch])
}
