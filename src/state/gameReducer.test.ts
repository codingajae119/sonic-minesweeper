import { describe, it, expect } from 'vitest'
import { gameReducer, initialState } from './gameReducer'
import { generateBoard } from '../domain/BoardGenerator'
import { DIFFICULTY_PRESETS } from '../types'
import type { GameState } from '../types'

const config = DIFFICULTY_PRESETS.beginner

function startedState(): GameState {
  const board = generateBoard(config)
  return gameReducer(initialState, { type: 'START_GAME', difficulty: config, board })
}

describe('gameReducer - START_GAME', () => {
  it('transitions phase to playing', () => {
    const state = startedState()
    expect(state.phase).toBe('playing')
  })

  it('sets remainingTime to timeBudget', () => {
    const state = startedState()
    expect(state.remainingTime).toBe(config.timeBudget)
  })

  it('initializes score fields to zero', () => {
    const state = startedState()
    expect(state.baseScore).toBe(0)
    expect(state.wrongCount).toBe(0)
    expect(state.flaggedCount).toBe(0)
  })
})

describe('gameReducer - TICK', () => {
  it('decrements remainingTime', () => {
    const s0 = startedState()
    const s1 = gameReducer(s0, { type: 'TICK', deltaTime: 1.0 })
    expect(s1.remainingTime).toBeCloseTo(config.timeBudget - 1.0)
  })

  it('triggers GAME_OVER when time reaches zero', () => {
    let state = startedState()
    state = gameReducer(state, { type: 'TICK', deltaTime: config.timeBudget + 1 })
    expect(state.phase).toBe('game-over')
    expect(state.gameOverReason).toBe('time')
    expect(state.remainingTime).toBe(0)
  })

  it('is no-op when not in playing phase', () => {
    const state = { ...startedState(), phase: 'game-over' as const }
    const next = gameReducer(state, { type: 'TICK', deltaTime: 1.0 })
    expect(next.remainingTime).toBe(state.remainingTime)
  })
})

describe('gameReducer - TAP_CELL on mine', () => {
  it('flags the mine cell', () => {
    const state = startedState()
    const mine = state.mines[0]
    const next = gameReducer(state, { type: 'TAP_CELL', row: mine.row, col: mine.col })
    expect(next.cells[mine.row][mine.col].state).toBe('flagged')
  })

  it('increments flaggedCount and baseScore', () => {
    const state = startedState()
    const mine = state.mines[0]
    const next = gameReducer(state, { type: 'TAP_CELL', row: mine.row, col: mine.col })
    expect(next.flaggedCount).toBe(1)
    expect(next.baseScore).toBe(200)
  })

  it('transitions to win when all mines flagged', () => {
    let state = startedState()
    for (const mine of state.mines) {
      state = gameReducer(state, { type: 'TAP_CELL', row: mine.row, col: mine.col })
    }
    expect(state.phase).toBe('win')
  })

  it('is no-op on already-flagged cell', () => {
    const state = startedState()
    const mine = state.mines[0]
    const s1 = gameReducer(state, { type: 'TAP_CELL', row: mine.row, col: mine.col })
    const s2 = gameReducer(s1, { type: 'TAP_CELL', row: mine.row, col: mine.col })
    expect(s2.flaggedCount).toBe(1)
  })
})

describe('gameReducer - TAP_CELL on non-mine', () => {
  function findNonMineCell(state: GameState) {
    for (const row of state.cells) {
      for (const cell of row) {
        if (!cell.hasMine) return cell
      }
    }
    throw new Error('no non-mine cell found')
  }

  it('marks cell as wrong', () => {
    const state = startedState()
    const cell = findNonMineCell(state)
    const next = gameReducer(state, { type: 'TAP_CELL', row: cell.row, col: cell.col })
    expect(next.cells[cell.row][cell.col].state).toBe('wrong')
  })

  it('increments wrongCount and deducts time', () => {
    const state = startedState()
    const cell = findNonMineCell(state)
    const next = gameReducer(state, { type: 'TAP_CELL', row: cell.row, col: cell.col })
    expect(next.wrongCount).toBe(1)
    expect(next.remainingTime).toBe(state.remainingTime - config.wrongTapCost)
  })

  it('sets pendingTimePenalty', () => {
    const state = startedState()
    const cell = findNonMineCell(state)
    const next = gameReducer(state, { type: 'TAP_CELL', row: cell.row, col: cell.col })
    expect(next.pendingTimePenalty).toBe(config.wrongTapCost)
  })

  it('triggers GAME_OVER after 3 wrong taps', () => {
    let state = startedState()
    let wrongCount = 0
    for (const row of state.cells) {
      for (const cell of row) {
        if (!cell.hasMine && wrongCount < 3) {
          state = gameReducer(state, { type: 'TAP_CELL', row: cell.row, col: cell.col })
          wrongCount++
        }
      }
    }
    expect(state.phase).toBe('game-over')
    expect(state.gameOverReason).toBe('wrong-count')
  })
})

describe('gameReducer - LONG_PRESS_COMPLETE', () => {
  it('deducts listenCost from remainingTime', () => {
    const state = startedState()
    const mine = state.mines[0]
    const next = gameReducer(state, { type: 'LONG_PRESS_COMPLETE', row: mine.row, col: mine.col })
    expect(next.remainingTime).toBe(state.remainingTime - config.listenCost)
  })

  it('flags mine cell on LONG_PRESS_COMPLETE on mine', () => {
    const state = startedState()
    const mine = state.mines[0]
    const next = gameReducer(state, { type: 'LONG_PRESS_COMPLETE', row: mine.row, col: mine.col })
    expect(next.cells[mine.row][mine.col].state).toBe('flagged')
    expect(next.flaggedCount).toBe(1)
  })

  it('sets pendingTimePenalty to listenCost', () => {
    const state = startedState()
    const mine = state.mines[0]
    const next = gameReducer(state, { type: 'LONG_PRESS_COMPLETE', row: mine.row, col: mine.col })
    expect(next.pendingTimePenalty).toBe(config.listenCost)
  })
})

describe('gameReducer - RESET', () => {
  it('returns to idle phase', () => {
    const state = startedState()
    const next = gameReducer(state, { type: 'RESET' })
    expect(next.phase).toBe('idle')
  })

  it('preserves visualAssist setting', () => {
    const state = { ...startedState(), visualAssist: true }
    const next = gameReducer(state, { type: 'RESET' })
    expect(next.visualAssist).toBe(true)
  })
})

describe('gameReducer - SET_AUDIO_PLAYING / TOGGLE_VISUAL_ASSIST / CLEAR_TIME_PENALTY', () => {
  it('toggles isAudioPlaying', () => {
    const state = startedState()
    const next = gameReducer(state, { type: 'SET_AUDIO_PLAYING', playing: true })
    expect(next.isAudioPlaying).toBe(true)
  })

  it('toggles visualAssist', () => {
    const state = startedState()
    const next = gameReducer(state, { type: 'TOGGLE_VISUAL_ASSIST' })
    expect(next.visualAssist).toBe(true)
    const next2 = gameReducer(next, { type: 'TOGGLE_VISUAL_ASSIST' })
    expect(next2.visualAssist).toBe(false)
  })

  it('clears pendingTimePenalty', () => {
    const state = { ...startedState(), pendingTimePenalty: 5 }
    const next = gameReducer(state, { type: 'CLEAR_TIME_PENALTY' })
    expect(next.pendingTimePenalty).toBeNull()
  })
})
