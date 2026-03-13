import { describe, it, expect } from 'vitest'
import { computeWin, computeGameOver } from './ScoreCalculator'

describe('ScoreCalculator.computeWin', () => {
  it('calculates base score from correct count', () => {
    const result = computeWin({
      correctCount: 3,
      wrongCount: 0,
      remainingTime: 0,
      streakHistory: [],
    })
    expect(result.baseScore).toBe(600)
    expect(result.wrongDeduction).toBe(0)
    expect(result.timeBonus).toBe(0)
    expect(result.streakBonus).toBe(0)
    expect(result.total).toBe(600)
  })

  it('deducts 100 per wrong tap', () => {
    const result = computeWin({
      correctCount: 4,
      wrongCount: 2,
      remainingTime: 0,
      streakHistory: [],
    })
    expect(result.wrongDeduction).toBe(200)
    expect(result.total).toBe(800 - 200)
  })

  it('adds time bonus (remaining × 10)', () => {
    const result = computeWin({
      correctCount: 1,
      wrongCount: 0,
      remainingTime: 50,
      streakHistory: [],
    })
    expect(result.timeBonus).toBe(500)
    expect(result.total).toBe(200 + 500)
  })

  it('calculates streak bonus with N×(N+1)/2×50 formula', () => {
    // streak of 3 → 3×4/2×50 = 300
    const result = computeWin({
      correctCount: 3,
      wrongCount: 0,
      remainingTime: 0,
      streakHistory: [3],
    })
    expect(result.streakBonus).toBe(300)
  })

  it('sums multiple streaks', () => {
    // streak 2 → 150, streak 3 → 300
    const result = computeWin({
      correctCount: 5,
      wrongCount: 0,
      remainingTime: 0,
      streakHistory: [2, 3],
    })
    expect(result.streakBonus).toBe(150 + 300)
  })

  it('computes full breakdown with all components', () => {
    const result = computeWin({
      correctCount: 6,
      wrongCount: 1,
      remainingTime: 30,
      streakHistory: [2, 4],
    })
    // base: 1200, wrong: 100, timeBonus: 300, streakBonus: 150+500=650
    expect(result.baseScore).toBe(1200)
    expect(result.wrongDeduction).toBe(100)
    expect(result.timeBonus).toBe(300)
    expect(result.streakBonus).toBe(650)
    expect(result.total).toBe(1200 - 100 + 300 + 650)
  })
})

describe('ScoreCalculator.computeGameOver', () => {
  it('returns 50% of (base - deductions)', () => {
    const result = computeGameOver({ correctCount: 4, wrongCount: 2 })
    // (800 - 200) × 0.5 = 300
    expect(result.total).toBe(300)
  })

  it('has no time or streak bonus', () => {
    const result = computeGameOver({ correctCount: 3, wrongCount: 0 })
    expect(result.timeBonus).toBe(0)
    expect(result.streakBonus).toBe(0)
  })

  it('floors the result', () => {
    const result = computeGameOver({ correctCount: 1, wrongCount: 0 })
    // (200 - 0) × 0.5 = 100
    expect(result.total).toBe(100)
  })

  it('does not go below zero', () => {
    const result = computeGameOver({ correctCount: 0, wrongCount: 5 })
    expect(result.total).toBeGreaterThanOrEqual(0)
  })
})
