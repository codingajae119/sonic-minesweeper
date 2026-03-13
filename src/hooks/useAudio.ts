import { useCallback } from 'react'
import { AudioService } from '../infrastructure/AudioService'
import type { GameAction, MineGain } from '../types'

export function useAudio(dispatch: React.Dispatch<GameAction>) {
  const audioSupported = AudioService.audioSupported

  const startExploration = useCallback(
    (mineGains: ReadonlyArray<MineGain>) => {
      AudioService.startExploration(mineGains)
      dispatch({ type: 'SET_AUDIO_PLAYING', playing: true })
    },
    [dispatch],
  )

  const stopExploration = useCallback(() => {
    AudioService.stopExploration()
    setTimeout(() => {
      dispatch({ type: 'SET_AUDIO_PLAYING', playing: false })
    }, 350)
  }, [dispatch])

  const playCorrectTap = useCallback(() => {
    AudioService.playCorrectTap()
  }, [])

  const playWrongTap = useCallback(() => {
    AudioService.playWrongTap()
  }, [])

  const playGameOver = useCallback((frequencies: ReadonlyArray<number>) => {
    AudioService.playGameOver(frequencies)
  }, [])

  const playVictory = useCallback((frequencies: ReadonlyArray<number>) => {
    AudioService.playVictory(frequencies)
  }, [])

  const playUrgentBeep = useCallback(() => {
    AudioService.playUrgentBeep()
  }, [])

  return {
    audioSupported,
    startExploration,
    stopExploration,
    playCorrectTap,
    playWrongTap,
    playGameOver,
    playVictory,
    playUrgentBeep,
  }
}
