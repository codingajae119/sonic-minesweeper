import { describe, it, expect } from 'vitest'
import { computeMineGains } from './AttenuationCalculator'
import type { Mine, CellPosition } from '../types'

const makeMine = (row: number, col: number, id = 'm1'): Mine => ({
  id,
  row,
  col,
  frequency: 440,
})

describe('AttenuationCalculator', () => {
  const radius = 5

  it('returns gain = 0.3 when mine is at same cell (d=0)', () => {
    const pos: CellPosition = { row: 0, col: 0 }
    const result = computeMineGains(pos, [makeMine(0, 0)], radius)
    expect(result).toHaveLength(1)
    expect(result[0].gain).toBeCloseTo(0.3, 5)
  })

  it('returns gain = 0 when mine is exactly at radius', () => {
    const pos: CellPosition = { row: 0, col: 0 }
    const result = computeMineGains(pos, [makeMine(0, radius)], radius)
    expect(result).toHaveLength(1)
    expect(result[0].gain).toBeCloseTo(0, 5)
  })

  it('returns empty array when mine is beyond radius', () => {
    const pos: CellPosition = { row: 0, col: 0 }
    const result = computeMineGains(pos, [makeMine(0, radius + 1)], radius)
    expect(result).toHaveLength(0)
  })

  it('all returned gains are <= 0.3', () => {
    const pos: CellPosition = { row: 5, col: 5 }
    const mines = [
      makeMine(5, 5, 'm1'),
      makeMine(5, 6, 'm2'),
      makeMine(5, 8, 'm3'),
    ]
    const result = computeMineGains(pos, mines, radius)
    for (const mg of result) {
      expect(mg.gain).toBeLessThanOrEqual(0.3)
    }
  })

  it('returns empty array when no mines in range', () => {
    const pos: CellPosition = { row: 0, col: 0 }
    const mines = [makeMine(10, 10, 'm1'), makeMine(12, 12, 'm2')]
    const result = computeMineGains(pos, mines, radius)
    expect(result).toHaveLength(0)
  })

  it('gain decreases with distance', () => {
    const pos: CellPosition = { row: 0, col: 0 }
    const r1 = computeMineGains(pos, [makeMine(0, 1)], radius)
    const r2 = computeMineGains(pos, [makeMine(0, 3)], radius)
    expect(r1[0].gain).toBeGreaterThan(r2[0].gain)
  })

  it('returns only in-range mines from mixed list', () => {
    const pos: CellPosition = { row: 0, col: 0 }
    const mines = [
      makeMine(0, 2, 'close'),
      makeMine(0, 10, 'far'),
    ]
    const result = computeMineGains(pos, mines, radius)
    expect(result).toHaveLength(1)
    expect(result[0].mine.id).toBe('close')
  })
})
