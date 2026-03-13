import type { ScoreBreakdown } from '../types'

interface WinParams {
  correctCount: number
  wrongCount: number
  remainingTime: number
  streakHistory: number[]
}

interface GameOverParams {
  correctCount: number
  wrongCount: number
}

export function computeWin(params: WinParams): ScoreBreakdown {
  const { correctCount, wrongCount, remainingTime, streakHistory } = params
  const baseScore = correctCount * 200
  const wrongDeduction = wrongCount * 100
  const timeBonus = Math.floor(remainingTime * 10)
  const streakBonus = streakHistory.reduce((sum, n) => sum + (n * (n + 1)) / 2 * 50, 0)
  const total = baseScore - wrongDeduction + timeBonus + streakBonus

  return { baseScore, wrongDeduction, timeBonus, streakBonus, total }
}

export function computeGameOver(params: GameOverParams): ScoreBreakdown {
  const { correctCount, wrongCount } = params
  const baseScore = correctCount * 200
  const wrongDeduction = wrongCount * 100
  const subtotal = Math.max(0, baseScore - wrongDeduction)
  const total = Math.floor(subtotal * 0.5)

  return { baseScore, wrongDeduction, timeBonus: 0, streakBonus: 0, total }
}
