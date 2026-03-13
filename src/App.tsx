import { useCallback } from 'react'
import { useGame } from './state/GameContext'
import { useTimer } from './hooks/useTimer'
import { useAudio } from './hooks/useAudio'
import { StartScreen } from './components/StartScreen/StartScreen'
import { Header } from './components/Header/Header'
import { Board } from './components/Board/Board'
import { BottomBar } from './components/BottomBar/BottomBar'
import { ResultModal } from './components/ResultModal/ResultModal'

function GameApp() {
  const { state, dispatch } = useGame()
  const audio = useAudio(dispatch)

  useTimer(state.phase, dispatch)

  const handleClearPenalty = useCallback(() => {
    dispatch({ type: 'CLEAR_TIME_PENALTY' })
  }, [dispatch])

  const handleToggleVisualAssist = useCallback(() => {
    dispatch({ type: 'TOGGLE_VISUAL_ASSIST' })
  }, [dispatch])

  if (state.phase === 'idle') {
    return (
      <StartScreen dispatch={dispatch} audioSupported={audio.audioSupported} />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header
        state={state}
        onClearPenalty={handleClearPenalty}
        onToggleVisualAssist={handleToggleVisualAssist}
      />
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Board state={state} dispatch={dispatch} />
      </main>
      {state.difficulty && (
        <BottomBar difficulty={state.difficulty} phase={state.phase} dispatch={dispatch} />
      )}
      {(state.phase === 'win' || state.phase === 'game-over') && (
        <ResultModal state={state} dispatch={dispatch} />
      )}
    </div>
  )
}

export default function App() {
  return <GameApp />
}
