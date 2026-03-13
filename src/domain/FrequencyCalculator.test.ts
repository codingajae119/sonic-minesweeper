import { describe, it, expect } from 'vitest'
import { assignFrequencies } from './FrequencyCalculator'

describe('FrequencyCalculator', () => {
  it('returns exactly mineCount frequencies', () => {
    const freqs = assignFrequencies(6)
    expect(freqs).toHaveLength(6)
  })

  it('all frequencies are in range [220, 1760]', () => {
    const freqs = assignFrequencies(20)
    for (const f of freqs) {
      expect(f).toBeGreaterThanOrEqual(220)
      expect(f).toBeLessThanOrEqual(1760 + 0.001) // floating point tolerance
    }
  })

  it('adjacent sorted frequencies differ by >= 5.9% for small mine counts', () => {
    // With mineCount=6, ratio = 2^(3/6) = 2^0.5 ≈ 1.414 >> 1.059
    const freqs = assignFrequencies(6)
    const sorted = [...freqs].sort((a, b) => a - b)
    for (let i = 1; i < sorted.length; i++) {
      const ratio = sorted[i] / sorted[i - 1]
      expect(ratio).toBeGreaterThanOrEqual(1.059)
    }
  })

  it('works for mineCount = 1', () => {
    const freqs = assignFrequencies(1)
    expect(freqs).toHaveLength(1)
    expect(freqs[0]).toBeGreaterThanOrEqual(220)
    expect(freqs[0]).toBeLessThanOrEqual(1760 + 0.001)
  })

  it('returns a different order each call (shuffled)', () => {
    const results = new Set<string>()
    for (let i = 0; i < 10; i++) {
      results.add(JSON.stringify(assignFrequencies(6)))
    }
    // With 6 mines there are many possible orders; at least 2 distinct orders expected
    expect(results.size).toBeGreaterThan(1)
  })
})
