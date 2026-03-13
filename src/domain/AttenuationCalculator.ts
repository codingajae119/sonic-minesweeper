import type { CellPosition, Mine, MineGain } from '../types'

const MAX_GAIN = 0.3

/**
 * Compute per-mine gain values based on Euclidean distance attenuation.
 * gain = 0.3 × (1 − d/radius)² for d ≤ radius, zero otherwise.
 */
export function computeMineGains(
  pos: CellPosition,
  mines: readonly Mine[],
  detectionRadius: number,
): ReadonlyArray<MineGain> {
  const result: MineGain[] = []
  for (const mine of mines) {
    const d = Math.sqrt(
      Math.pow(pos.row - mine.row, 2) + Math.pow(pos.col - mine.col, 2),
    )
    if (d <= detectionRadius) {
      const gain = Math.min(MAX_GAIN * Math.pow(1 - d / detectionRadius, 2), MAX_GAIN)
      result.push({ mine, gain })
    }
  }
  return result
}
