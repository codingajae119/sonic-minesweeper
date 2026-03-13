import type { GameState, GameAction, Cell } from '../types'

export const initialState: GameState = {
  phase: 'idle',
  difficulty: null,
  cells: [],
  mines: [],
  remainingTime: 0,
  wrongCount: 0,
  baseScore: 0,
  wrongDeduction: 0,
  streakCount: 0,
  streakHistory: [],
  flaggedCount: 0,
  gameOverReason: null,
  isAudioPlaying: false,
  visualAssist: false,
  pendingTimePenalty: null,
}

function checkWin(state: GameState): boolean {
  return state.difficulty !== null && state.flaggedCount >= state.difficulty.mineCount
}

function cloneCell(cell: Cell): Cell {
  return { ...cell }
}

function cloneCells(cells: Cell[][]): Cell[][] {
  return cells.map(row => row.map(cloneCell))
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SELECT_DIFFICULTY':
      return { ...state, difficulty: action.difficulty }

    case 'START_GAME': {
      return {
        ...initialState,
        phase: 'playing',
        difficulty: action.difficulty,
        cells: action.board.cells,
        mines: action.board.mines,
        remainingTime: action.difficulty.timeBudget,
        visualAssist: state.visualAssist,
      }
    }

    case 'RESET':
      return { ...initialState, visualAssist: state.visualAssist }

    case 'TICK': {
      if (state.phase !== 'playing') return state
      const newTime = state.remainingTime - action.deltaTime
      if (newTime <= 0) {
        return {
          ...state,
          remainingTime: 0,
          phase: 'game-over',
          gameOverReason: 'time',
        }
      }
      return { ...state, remainingTime: newTime }
    }

    case 'TAP_CELL': {
      if (state.phase !== 'playing') return state
      const cell = state.cells[action.row][action.col]
      if (cell.state !== 'hidden') return state

      const newCells = cloneCells(state.cells)

      if (cell.hasMine) {
        // Correct tap: flag the mine
        newCells[action.row][action.col].state = 'flagged'
        const newFlagged = state.flaggedCount + 1
        const newStreak = state.streakCount + 1
        const newBase = state.baseScore + 200

        const newState = {
          ...state,
          cells: newCells,
          flaggedCount: newFlagged,
          streakCount: newStreak,
          baseScore: newBase,
        }
        if (checkWin({ ...newState })) {
          return { ...newState, phase: 'win' }
        }
        return newState
      } else {
        // Wrong tap
        newCells[action.row][action.col].state = 'wrong'
        const newWrongCount = state.wrongCount + 1
        const newStreakHistory = state.streakCount > 0
          ? [...state.streakHistory, state.streakCount]
          : state.streakHistory
        const newDeduction = state.wrongDeduction + 100
        const penalty = state.difficulty?.wrongTapCost ?? 0
        const newTime = Math.max(0, state.remainingTime - penalty)

        if (newWrongCount >= 3) {
          return {
            ...state,
            cells: newCells,
            wrongCount: newWrongCount,
            wrongDeduction: newDeduction,
            streakCount: 0,
            streakHistory: newStreakHistory,
            phase: 'game-over',
            gameOverReason: 'wrong-count',
            remainingTime: newTime,
            pendingTimePenalty: penalty,
          }
        }

        return {
          ...state,
          cells: newCells,
          wrongCount: newWrongCount,
          wrongDeduction: newDeduction,
          streakCount: 0,
          streakHistory: newStreakHistory,
          remainingTime: newTime,
          pendingTimePenalty: penalty,
        }
      }
    }

    case 'LONG_PRESS_COMPLETE': {
      if (state.phase !== 'playing') return state
      const cell = state.cells[action.row][action.col]
      const listenCost = state.difficulty?.listenCost ?? 0
      const newTime = Math.max(0, state.remainingTime - listenCost)
      const newCells = cloneCells(state.cells)

      let newBase = state.baseScore
      let newFlagged = state.flaggedCount
      let newStreak = state.streakCount

      if (cell.state === 'hidden' && cell.hasMine) {
        newCells[action.row][action.col].state = 'flagged'
        newFlagged = state.flaggedCount + 1
        newStreak = state.streakCount + 1
        newBase = state.baseScore + 200
      }

      const newState = {
        ...state,
        cells: newCells,
        remainingTime: newTime,
        pendingTimePenalty: listenCost,
        flaggedCount: newFlagged,
        streakCount: newStreak,
        baseScore: newBase,
      }

      if (newTime <= 0) {
        return { ...newState, phase: 'game-over', gameOverReason: 'time' }
      }
      if (checkWin(newState)) {
        return { ...newState, phase: 'win' }
      }
      return newState
    }

    case 'GIVE_UP': {
      if (state.phase !== 'playing') return state
      const newCells = cloneCells(state.cells)
      for (const mine of state.mines) {
        const cell = newCells[mine.row][mine.col]
        if (cell.state === 'hidden') {
          cell.state = 'revealed-mine'
        }
      }
      return { ...state, phase: 'give-up', cells: newCells }
    }

    case 'WIN':
      return { ...state, phase: 'win' }

    case 'GAME_OVER':
      return { ...state, phase: 'game-over', gameOverReason: action.reason }

    case 'SET_AUDIO_PLAYING':
      return { ...state, isAudioPlaying: action.playing }

    case 'TOGGLE_VISUAL_ASSIST':
      return { ...state, visualAssist: !state.visualAssist }

    case 'CLEAR_TIME_PENALTY':
      return { ...state, pendingTimePenalty: null }

    default:
      return state
  }
}
