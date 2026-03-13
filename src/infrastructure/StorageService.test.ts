import { describe, it, expect, beforeEach, vi } from 'vitest'
import { saveHighScore, getHighScores, getEarphoneShown, setEarphoneShown } from './StorageService'

describe('StorageService', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saves and retrieves a high score', () => {
    saveHighScore({ score: 500, date: '2026-01-01', difficulty: 'beginner' })
    const scores = getHighScores('beginner')
    expect(scores).toHaveLength(1)
    expect(scores[0].score).toBe(500)
  })

  it('keeps scores sorted descending', () => {
    saveHighScore({ score: 300, date: '2026-01-01', difficulty: 'beginner' })
    saveHighScore({ score: 700, date: '2026-01-02', difficulty: 'beginner' })
    saveHighScore({ score: 500, date: '2026-01-03', difficulty: 'beginner' })
    const scores = getHighScores('beginner')
    expect(scores[0].score).toBe(700)
    expect(scores[1].score).toBe(500)
    expect(scores[2].score).toBe(300)
  })

  it('caps at top 5 scores', () => {
    for (let i = 0; i < 8; i++) {
      saveHighScore({ score: i * 100, date: '2026-01-01', difficulty: 'beginner' })
    }
    const scores = getHighScores('beginner')
    expect(scores).toHaveLength(5)
    expect(scores[0].score).toBe(700)
  })

  it('returns [] when no scores stored', () => {
    expect(getHighScores('intermediate')).toEqual([])
  })

  it('isolates scores by difficulty', () => {
    saveHighScore({ score: 500, date: '2026-01-01', difficulty: 'beginner' })
    expect(getHighScores('advanced')).toEqual([])
  })

  it('earphone flag defaults to false', () => {
    expect(getEarphoneShown()).toBe(false)
  })

  it('earphone flag persists after setEarphoneShown', () => {
    setEarphoneShown()
    expect(getEarphoneShown()).toBe(true)
  })

  it('getHighScores returns [] on localStorage error', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage error')
    })
    expect(getHighScores('beginner')).toEqual([])
    vi.restoreAllMocks()
  })

  it('getEarphoneShown returns false on localStorage error', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage error')
    })
    expect(getEarphoneShown()).toBe(false)
    vi.restoreAllMocks()
  })
})
