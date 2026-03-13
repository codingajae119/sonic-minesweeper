import { useEffect, useState, useCallback } from 'react'
import type { GameState, GameAction, ScoreBreakdown } from '../../types'
import { computeWin, computeGameOver } from '../../domain/ScoreCalculator'
import { saveHighScore, getHighScores } from '../../infrastructure/StorageService'
import { useAudio } from '../../hooks/useAudio'
import { generateBoard } from '../../domain/BoardGenerator'

interface ResultModalProps {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

function Confetti() {
  const pieces = Array.from({ length: 30 }, (_, i) => i)
  const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#a78bfa']
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 100 }}>
      {pieces.map(i => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${Math.random() * 100}%`,
            top: 0,
            width: 10,
            height: 10,
            backgroundColor: colors[i % colors.length],
            borderRadius: Math.random() > 0.5 ? '50%' : 2,
            animation: `confetti-fall ${1.5 + Math.random() * 2}s linear ${Math.random() * 0.5}s both`,
          }}
        />
      ))}
    </div>
  )
}

export function ResultModal({ state, dispatch }: ResultModalProps) {
  const { phase, mines, difficulty, wrongCount, streakHistory, streakCount, remainingTime, cells } = state
  const audio = useAudio(dispatch)
  const [revealedMines, setRevealedMines] = useState<Set<string>>(new Set())
  const [isNewBest, setIsNewBest] = useState(false)

  const isWin = phase === 'win'

  const allStreaks = streakCount > 0 ? [...streakHistory, streakCount] : streakHistory
  const correctCount = mines.filter(m => {
    const cell = cells[m.row]?.[m.col]
    return cell?.state === 'flagged'
  }).length

  const breakdown: ScoreBreakdown = isWin
    ? computeWin({ correctCount, wrongCount, remainingTime, streakHistory: allStreaks })
    : computeGameOver({ correctCount, wrongCount })

  useEffect(() => {
    if (!difficulty) return
    if (isWin) {
      audio.playVictory(mines.map(m => m.frequency))
      const scores = getHighScores(difficulty.difficulty)
      const top = scores[0]?.score ?? 0
      if (breakdown.total > top) {
        saveHighScore({ score: breakdown.total, date: new Date().toISOString(), difficulty: difficulty.difficulty })
        setIsNewBest(true)
      }
    } else {
      // Sequential mine reveal
      const frequencies = mines.map(m => m.frequency)
      audio.playGameOver(frequencies)
      mines.forEach((mine, i) => {
        setTimeout(() => {
          setRevealedMines(prev => new Set([...prev, `${mine.row},${mine.col}`]))
        }, i * 100)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRetry = useCallback(() => {
    if (!difficulty) return
    const board = generateBoard(difficulty)
    dispatch({ type: 'RESET' })
    dispatch({ type: 'START_GAME', difficulty, board })
  }, [difficulty, dispatch])

  const handleChangeDifficulty = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [dispatch])

  return (
    <>
      {isWin && <Confetti />}

      {/* Dimming overlay */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}>
        <div style={{
          backgroundColor: '#1e1e2e',
          border: '1px solid #3a3a5e',
          borderRadius: 16,
          padding: 24,
          width: '100%',
          maxWidth: 360,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '2.5em', marginBottom: 8 }}>
            {isWin ? '🏆' : '💥'}
          </div>
          <h2 style={{ color: '#e2e8f0', margin: '0 0 4px' }}>
            {isWin ? 'You Win!' : 'Game Over'}
          </h2>
          {!isWin && (
            <p style={{ color: '#94a3b8', fontSize: '0.9em', margin: '0 0 16px' }}>
              {state.gameOverReason === 'time' ? '⏰ Time exhausted' : '❌ Three wrong guesses'}
            </p>
          )}
          {isNewBest && (
            <div style={{ color: '#f59e0b', fontWeight: 'bold', marginBottom: 8 }}>
              🌟 New Best!
            </div>
          )}

          {/* Score breakdown */}
          <div style={{
            backgroundColor: '#2a2a3e',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            textAlign: 'left',
          }}>
            {[
              ['Base Score', `+${breakdown.baseScore}`],
              ['Wrong Deduction', `-${breakdown.wrongDeduction}`],
              ...(isWin ? [
                ['Time Bonus', `+${breakdown.timeBonus}`],
                ['Streak Bonus', `+${breakdown.streakBonus}`],
              ] : []),
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.9em' }}>
                <span style={{ color: '#94a3b8' }}>{label}</span>
                <span style={{ color: '#e2e8f0' }}>{val}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid #3a3a5e', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span style={{ color: '#e2e8f0' }}>Total</span>
              <span style={{ color: '#a78bfa', fontSize: '1.1em' }}>{breakdown.total}</span>
            </div>
          </div>

          {/* Mine positions revealed on game over */}
          {!isWin && revealedMines.size > 0 && (
            <p style={{ color: '#94a3b8', fontSize: '0.8em', marginBottom: 12 }}>
              💣 {revealedMines.size}/{mines.length} mines revealed
            </p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={handleRetry}
              style={{
                padding: '12px',
                backgroundColor: '#6366f1',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              🔄 Retry
            </button>
            <button
              onClick={handleChangeDifficulty}
              style={{
                padding: '12px',
                backgroundColor: '#2a2a3e',
                color: '#e2e8f0',
                border: '1px solid #3a3a5e',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              ⚙️ Change Difficulty
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
