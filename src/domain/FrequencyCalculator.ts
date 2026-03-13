const MIN_FREQ = 220
const OCTAVES = 3
const MIN_SEMITONE_RATIO = 1.059 // ~5.9% = one semitone

function fisherYatesShuffle(arr: number[]): number[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function meetsMinSeparation(freqs: number[]): boolean {
  const sorted = [...freqs].sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] / sorted[i - 1] < MIN_SEMITONE_RATIO) return false
  }
  return true
}

/**
 * Assign log-scale frequencies in [220, 1760] Hz to `mineCount` mines.
 * Frequencies are shuffled; the minimum semitone separation constraint is
 * enforced by retrying the shuffle up to 10 times.
 */
export function assignFrequencies(mineCount: number): ReadonlyArray<number> {
  const base: number[] = []
  for (let i = 0; i < mineCount; i++) {
    base.push(MIN_FREQ * Math.pow(2, (i / mineCount) * OCTAVES))
  }

  // Single mine — no separation constraint needed
  if (mineCount <= 1) return base

  let shuffled = fisherYatesShuffle(base)
  for (let attempt = 0; attempt < 10; attempt++) {
    if (meetsMinSeparation(shuffled)) return shuffled
    shuffled = fisherYatesShuffle(base)
  }
  // Fallback: return sorted (always meets separation for log-scale spacing)
  return base
}
