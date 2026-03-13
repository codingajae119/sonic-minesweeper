import { useState } from 'react'
import { DIFFICULTY_PRESETS } from '../../types'
import type { Difficulty, GameAction } from '../../types'
import { generateBoard } from '../../domain/BoardGenerator'
import { AudioService } from '../../infrastructure/AudioService'
import { getEarphoneShown, setEarphoneShown } from '../../infrastructure/StorageService'
import { KofiFooter } from '../KofiFooter/KofiFooter'

interface StartScreenProps {
  dispatch: React.Dispatch<GameAction>
  audioSupported: boolean
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: '🟢 Beginner',
  intermediate: '🟡 Intermediate',
  advanced: '🔴 Advanced',
}

export function StartScreen({ dispatch, audioSupported }: StartScreenProps) {
  const [earphoneShown] = useState(() => getEarphoneShown())

  const handleSelect = (difficulty: Difficulty) => {
    const config = DIFFICULTY_PRESETS[difficulty]
    AudioService.initialize()
    const board = generateBoard(config)
    if (!earphoneShown) {
      setEarphoneShown()
    }
    dispatch({ type: 'START_GAME', difficulty: config, board })
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 16px',
      gap: 24,
      minHeight: '100vh',
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ color: '#e2e8f0', fontSize: '2em', margin: 0 }}>🎵 Sonic Minesweeper</h1>
        <p style={{ color: '#94a3b8', marginTop: 8 }}>
          Listen for mines. Long-press to explore. Tap to flag.
        </p>
      </div>

      {!audioSupported && (
        <div style={{
          backgroundColor: '#7f1d1d',
          color: '#fca5a5',
          padding: '12px 16px',
          borderRadius: 8,
          maxWidth: 360,
          textAlign: 'center',
        }}>
          ⚠️ Web Audio API not supported in this browser. Audio features will be disabled.
        </div>
      )}

      {!earphoneShown && (
        <div style={{
          backgroundColor: '#1e3a5f',
          color: '#93c5fd',
          padding: '12px 16px',
          borderRadius: 8,
          maxWidth: 360,
          textAlign: 'center',
          fontSize: '0.9em',
        }}>
          🎧 Using earphones is recommended for the best experience!
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 360 }}>
        {(Object.entries(DIFFICULTY_PRESETS) as [Difficulty, typeof DIFFICULTY_PRESETS.beginner][]).map(
          ([key, cfg]) => (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              style={{
                padding: '16px',
                backgroundColor: '#2a2a3e',
                border: '2px solid #3a3a5e',
                borderRadius: 12,
                cursor: 'pointer',
                textAlign: 'left',
                color: '#e2e8f0',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ fontWeight: 'bold', fontSize: '1em', marginBottom: 8 }}>
                {DIFFICULTY_LABELS[key]}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: '0.8em', color: '#94a3b8' }}>
                <span>Board: {cfg.rows}×{cfg.cols}</span>
                <span>Mines: {cfg.mineCount}</span>
                <span>Time: {cfg.timeBudget}s</span>
                <span>Radius: {cfg.detectionRadius}</span>
                <span>Listen: −{cfg.listenCost}s</span>
                <span>Wrong: −{cfg.wrongTapCost}s</span>
              </div>
            </button>
          ),
        )}
      </div>
      <KofiFooter />
    </div>
  )
}
