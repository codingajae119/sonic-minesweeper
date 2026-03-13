import type { BoardData, Cell, DifficultyConfig, Mine } from '../types'
import { assignFrequencies } from './FrequencyCalculator'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function generateBoard(config: DifficultyConfig): BoardData {
  const { rows, cols, mineCount } = config

  // Build all cell indices and shuffle to pick mine positions
  const indices = Array.from({ length: rows * cols }, (_, i) => i)
  const mineIndices = new Set(shuffle(indices).slice(0, mineCount))

  // Assign frequencies to mines
  const frequencies = assignFrequencies(mineCount)

  // Initialize cells grid
  const cells: Cell[][] = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => ({
      row: r,
      col: c,
      state: 'hidden' as const,
      hasMine: false,
      mineId: null,
    })),
  )

  // Place mines
  const mines: Mine[] = []
  let freqIdx = 0
  for (const idx of mineIndices) {
    const row = Math.floor(idx / cols)
    const col = idx % cols
    const id = `mine-${row}-${col}`
    mines.push({ id, row, col, frequency: frequencies[freqIdx++] })
    cells[row][col].hasMine = true
    cells[row][col].mineId = id
  }

  return { cells, mines }
}
