import type { DifficultyConfig, GameAction, GamePhase } from '../../types'
import { generateBoard } from '../../domain/BoardGenerator'

interface BottomBarProps {
  difficulty: DifficultyConfig
  phase: GamePhase
  dispatch: React.Dispatch<GameAction>
}

export function BottomBar({ difficulty, phase, dispatch }: BottomBarProps) {
  const handleNewGame = () => {
    const board = generateBoard(difficulty)
    dispatch({ type: 'RESET' })
    dispatch({ type: 'START_GAME', difficulty, board })
  }

  const handleChangeDifficulty = () => {
    dispatch({ type: 'RESET' })
  }

  const handleGiveUp = () => {
    dispatch({ type: 'GIVE_UP' })
  }

  return (
    <div style={{
      position: 'sticky',
      bottom: 0,
      display: 'flex',
      gap: 8,
      padding: '8px 12px',
      backgroundColor: '#13131f',
      borderTop: '1px solid #3a3a5e',
    }}>
      <button
        onClick={handleNewGame}
        style={{
          flex: 1,
          padding: '10px 0',
          backgroundColor: '#6366f1',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '0.95em',
        }}
      >
        🔄 New Game
      </button>
      {phase === 'playing' && (
        <button
          onClick={handleGiveUp}
          style={{
            flex: 1,
            padding: '10px 0',
            backgroundColor: '#7f1d1d',
            color: '#fca5a5',
            border: '1px solid #991b1b',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: '0.95em',
          }}
        >
          🏳️ Give Up
        </button>
      )}
      <button
        onClick={handleChangeDifficulty}
        style={{
          flex: 1,
          padding: '10px 0',
          backgroundColor: '#2a2a3e',
          color: '#e2e8f0',
          border: '1px solid #3a3a5e',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: '0.95em',
        }}
      >
        ⚙️ Difficulty
      </button>
    </div>
  )
}
