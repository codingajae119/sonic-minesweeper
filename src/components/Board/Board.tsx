import { useCallback, useState, useRef } from 'react'
import { Cell } from '../Cell/Cell'
import type { GameState, GameAction } from '../../types'
import { computeMineGains } from '../../domain/AttenuationCalculator'
import { useAudio } from '../../hooks/useAudio'

interface BoardProps {
  state: GameState
  dispatch: React.Dispatch<GameAction>
}

function computeAdjacentCount(cells: GameState['cells'], row: number, col: number): number {
  let count = 0
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const r = row + dr
      const c = col + dc
      if (r >= 0 && r < cells.length && c >= 0 && c < cells[0].length) {
        if (cells[r][c].hasMine) count++
      }
    }
  }
  return count
}

export function Board({ state, dispatch }: BoardProps) {
  const { cells, mines, difficulty, phase, visualAssist } = state
  const audio = useAudio(dispatch)

  const [exploringCell, setExploringCell] = useState<{ row: number; col: number } | null>(null)
  const [volumeByCell, setVolumeByCell] = useState<Map<string, number>>(new Map())
  const [noMinesInRange, setNoMinesInRange] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  if (!difficulty || cells.length === 0) return null

  const { rows, cols, detectionRadius } = difficulty
  const isPlaying = phase === 'playing'
  const isGiveUp = phase === 'give-up'

  const cellSize = Math.min(
    Math.floor((window.innerWidth - 24) / cols),
    Math.floor((window.innerHeight * 0.7) / rows),
    64,
  )

  const detectionRadiusPx = detectionRadius * cellSize

  const handleTap = useCallback(
    (row: number, col: number) => {
      if (!isPlaying) return
      dispatch({ type: 'TAP_CELL', row, col })
      const cell = cells[row][col]
      if (cell.hasMine) {
        audio.playCorrectTap()
      } else {
        audio.playWrongTap()
      }
    },
    [dispatch, isPlaying, cells, audio],
  )

  const handleLongPressActivate = useCallback(
    (row: number, col: number) => {
      if (!isPlaying && !isGiveUp) return
      setExploringCell({ row, col })
      // During give-up, use ALL mines (as if no mines have been opened); otherwise filter flagged
      const minesForAudio = isGiveUp ? mines : mines.filter(m => cells[m.row][m.col].state !== 'flagged')
      const mineGains = computeMineGains({ row, col }, minesForAudio, detectionRadius)
      const newMap = new Map<string, number>()
      let maxVol = 0
      for (const mg of mineGains) {
        const vol = mg.gain / 0.3 // normalize to 0–1
        newMap.set(`${mg.mine.row},${mg.mine.col}`, vol)
        if (vol > maxVol) maxVol = vol
      }
      setVolumeByCell(newMap)
      setNoMinesInRange(mineGains.length === 0)
      audio.startExploration(mineGains)
    },
    [isPlaying, isGiveUp, mines, cells, detectionRadius, audio],
  )

  const handleLongPressRelease = useCallback(
    (row: number, col: number) => {
      setExploringCell(null)
      setVolumeByCell(new Map())
      setNoMinesInRange(false)
      audio.stopExploration()
      if (!isGiveUp) {
        dispatch({ type: 'LONG_PRESS_COMPLETE', row, col })
      }
    },
    [dispatch, audio, isGiveUp],
  )

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        touchAction: 'none',
        padding: '8px',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
          gap: 2,
        }}
        aria-label="Minesweeper game board"
        role="grid"
      >
        {cells.map(row =>
          row.map(cell => {
            const key = `${cell.row}-${cell.col}`
            const isExploring = !!(exploringCell &&
              exploringCell.row === cell.row &&
              exploringCell.col === cell.col)
            const volKey = `${cell.row},${cell.col}`
            const volumeLevel = volumeByCell.get(volKey) ?? 0
            const adjacent = visualAssist ? computeAdjacentCount(cells, cell.row, cell.col) : 0
            const disabled = isGiveUp ? false : (cell.state !== 'hidden' || !isPlaying)

            return (
              <Cell
                key={key}
                cell={cell}
                isExploring={isExploring}
                visualAssist={visualAssist}
                adjacentMineCount={adjacent}
                volumeLevel={volumeLevel}
                detectionRadiusPx={detectionRadiusPx}
                disabled={disabled}
                onTap={handleTap}
                onLongPressActivate={handleLongPressActivate}
                onLongPressRelease={handleLongPressRelease}
              />
            )
          }),
        )}
      </div>

      {/* No mines in range overlay */}
      {noMinesInRange && exploringCell && (
        <div
          aria-live="polite"
          style={{
            position: 'absolute',
            top: exploringCell.row * (cellSize + 2) + 8,
            left: exploringCell.col * (cellSize + 2) + 8 + cellSize,
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: '#94a3b8',
            padding: '4px 8px',
            borderRadius: 6,
            fontSize: '0.8em',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 20,
          }}
        >
          No mines in range
        </div>
      )}
    </div>
  )
}
