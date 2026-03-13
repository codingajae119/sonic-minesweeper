// ---- Enums / Union types ----

export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

export type GamePhase = 'idle' | 'playing' | 'game-over' | 'win' | 'give-up'

export type GameOverReason = 'time' | 'wrong-count'

export type CellState = 'hidden' | 'flagged' | 'wrong' | 'revealed-mine'

// ---- Configuration ----

export interface DifficultyConfig {
  difficulty: Difficulty
  rows: number
  cols: number
  mineCount: number
  timeBudget: number       // seconds
  detectionRadius: number  // grid cells (Euclidean)
  listenCost: number       // seconds deducted per long-press
  wrongTapCost: number     // seconds deducted per wrong tap
}

// ---- Domain types ----

export interface CellPosition {
  row: number
  col: number
}

export interface Mine {
  id: string
  row: number
  col: number
  frequency: number
}

export interface Cell {
  row: number
  col: number
  state: CellState
  hasMine: boolean
  mineId: string | null
}

export interface MineGain {
  mine: Mine
  gain: number
}

export interface ScoreBreakdown {
  baseScore: number
  wrongDeduction: number
  timeBonus: number
  streakBonus: number
  total: number
}

export interface HighScore {
  score: number
  date: string
  difficulty: Difficulty
}

// ---- Board ----

export interface BoardData {
  cells: Cell[][]
  mines: Mine[]
}

// ---- Game State ----

export interface GameState {
  phase: GamePhase
  difficulty: DifficultyConfig | null
  cells: Cell[][]
  mines: Mine[]
  remainingTime: number
  wrongCount: number
  baseScore: number
  wrongDeduction: number
  streakCount: number
  streakHistory: number[]
  flaggedCount: number
  gameOverReason: GameOverReason | null
  isAudioPlaying: boolean
  visualAssist: boolean
  pendingTimePenalty: number | null
}

// ---- Game Actions ----

export type GameAction =
  | { type: 'SELECT_DIFFICULTY'; difficulty: DifficultyConfig }
  | { type: 'START_GAME'; difficulty: DifficultyConfig; board: BoardData }
  | { type: 'TICK'; deltaTime: number }
  | { type: 'TAP_CELL'; row: number; col: number }
  | { type: 'LONG_PRESS_COMPLETE'; row: number; col: number }
  | { type: 'WIN' }
  | { type: 'GAME_OVER'; reason: GameOverReason }
  | { type: 'GIVE_UP' }
  | { type: 'RESET' }
  | { type: 'SET_AUDIO_PLAYING'; playing: boolean }
  | { type: 'TOGGLE_VISUAL_ASSIST' }
  | { type: 'CLEAR_TIME_PENALTY' }

// ---- Constants ----

export const DIFFICULTY_PRESETS: Record<Difficulty, DifficultyConfig> = {
  beginner: {
    difficulty: 'beginner',
    rows: 8,
    cols: 8,
    mineCount: 6,
    timeBudget: 360,
    detectionRadius: 6.0,
    listenCost: 3,
    wrongTapCost: 30,
  },
  intermediate: {
    difficulty: 'intermediate',
    rows: 12,
    cols: 12,
    mineCount: 20,
    timeBudget: 720,
    detectionRadius: 5.0,
    listenCost: 4,
    wrongTapCost: 50,
  },
  advanced: {
    difficulty: 'advanced',
    rows: 16,
    cols: 16,
    mineCount: 40,
    timeBudget: 1260,
    detectionRadius: 4.0,
    listenCost: 5,
    wrongTapCost: 70,
  },
}
