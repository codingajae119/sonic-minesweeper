import { describe, it, expect } from 'vitest'
import { generateBoard } from './BoardGenerator'
import { DIFFICULTY_PRESETS } from '../types'

describe('BoardGenerator', () => {
  const config = DIFFICULTY_PRESETS.beginner // 8×8, 6 mines

  it('generates exactly mineCount mines', () => {
    const board = generateBoard(config)
    expect(board.mines).toHaveLength(config.mineCount)
  })

  it('no two mines share the same position', () => {
    const board = generateBoard(config)
    const positions = board.mines.map(m => `${m.row},${m.col}`)
    const unique = new Set(positions)
    expect(unique.size).toBe(config.mineCount)
  })

  it('all cells are initialized in hidden state', () => {
    const board = generateBoard(config)
    for (const row of board.cells) {
      for (const cell of row) {
        expect(cell.state).toBe('hidden')
      }
    }
  })

  it('cells with mines have hasMine=true', () => {
    const board = generateBoard(config)
    for (const mine of board.mines) {
      const cell = board.cells[mine.row][mine.col]
      expect(cell.hasMine).toBe(true)
      expect(cell.mineId).toBe(mine.id)
    }
  })

  it('cells without mines have hasMine=false', () => {
    const board = generateBoard(config)
    const minePositions = new Set(board.mines.map(m => `${m.row},${m.col}`))
    for (const row of board.cells) {
      for (const cell of row) {
        const key = `${cell.row},${cell.col}`
        if (!minePositions.has(key)) {
          expect(cell.hasMine).toBe(false)
          expect(cell.mineId).toBeNull()
        }
      }
    }
  })

  it('board dimensions match config', () => {
    const board = generateBoard(config)
    expect(board.cells).toHaveLength(config.rows)
    for (const row of board.cells) {
      expect(row).toHaveLength(config.cols)
    }
  })

  it('each mine has a frequency assigned', () => {
    const board = generateBoard(config)
    for (const mine of board.mines) {
      expect(mine.frequency).toBeGreaterThan(0)
    }
  })
})
