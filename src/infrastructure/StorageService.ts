import type { Difficulty, HighScore } from '../types'

const SCORES_PREFIX = 'sonic-minesweeper-scores-'
const EARPHONE_KEY = 'sonic-minesweeper-earphone-shown'
const MAX_SCORES = 5

export function getHighScores(difficulty: Difficulty): HighScore[] {
  try {
    const raw = localStorage.getItem(`${SCORES_PREFIX}${difficulty}`)
    if (!raw) return []
    return JSON.parse(raw) as HighScore[]
  } catch {
    return []
  }
}

export function saveHighScore(score: HighScore): HighScore[] {
  try {
    const existing = getHighScores(score.difficulty)
    const updated = [...existing, score]
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SCORES)
    localStorage.setItem(`${SCORES_PREFIX}${score.difficulty}`, JSON.stringify(updated))
    return updated
  } catch {
    return []
  }
}

export function getEarphoneShown(): boolean {
  try {
    return localStorage.getItem(EARPHONE_KEY) === 'true'
  } catch {
    return false
  }
}

export function setEarphoneShown(): void {
  try {
    localStorage.setItem(EARPHONE_KEY, 'true')
  } catch {
    // ignore
  }
}
