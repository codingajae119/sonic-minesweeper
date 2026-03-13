import type { MineGain } from '../types'

let ctx: AudioContext | null = null
let masterGain: GainNode | null = null
let activeOscillators: OscillatorNode[] = []
let activeGains: GainNode[] = []

function getCtx(): AudioContext | null {
  return ctx
}

function ensureRunning(): void {
  if (ctx && ctx.state !== 'running') {
    ctx.resume().catch(() => {})
  }
}

export const AudioService = {
  initialize(): void {
    if (ctx) {
      ensureRunning()
      return
    }
    ctx = new AudioContext()
    masterGain = ctx.createGain()
    masterGain.connect(ctx.destination)
  },

  get audioSupported(): boolean {
    return typeof AudioContext !== 'undefined'
  },

  startExploration(mineGains: ReadonlyArray<MineGain>): void {
    const c = getCtx()
    if (!c || !masterGain) return
    ensureRunning()
    if (c.state !== 'running') return

    // Stop any existing exploration
    this.stopExploration()

    if (mineGains.length === 0) return

    const newMaster = c.createGain()
    newMaster.gain.setValueAtTime(0, c.currentTime)
    newMaster.gain.linearRampToValueAtTime(1, c.currentTime + 0.05)
    newMaster.connect(c.destination)
    masterGain = newMaster

    activeOscillators = []
    activeGains = []

    for (const mg of mineGains) {
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.frequency.value = mg.mine.frequency
      osc.type = 'sine'
      gain.gain.value = mg.gain
      osc.connect(gain)
      gain.connect(newMaster)
      osc.start()
      activeOscillators.push(osc)
      activeGains.push(gain)
    }
  },

  stopExploration(): void {
    const c = getCtx()
    if (!c || !masterGain) return

    const fadeEnd = c.currentTime + 0.3
    masterGain.gain.setValueAtTime(masterGain.gain.value, c.currentTime)
    masterGain.gain.linearRampToValueAtTime(0, fadeEnd)

    const oscsToStop = [...activeOscillators]
    setTimeout(() => {
      for (const osc of oscsToStop) {
        try { osc.stop() } catch { /* already stopped */ }
      }
    }, 350)
    activeOscillators = []
    activeGains = []
  },

  playCorrectTap(): void {
    const c = getCtx()
    if (!c) return
    ensureRunning()
    const notes = [880, 1100, 1320]
    notes.forEach((freq, i) => {
      const osc = c.createOscillator()
      const gain = c.createGain()
      const start = c.currentTime + i * 0.15
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.2, start)
      gain.gain.linearRampToValueAtTime(0, start + 0.12)
      osc.connect(gain)
      gain.connect(c.destination)
      osc.start(start)
      osc.stop(start + 0.15)
    })
  },

  playWrongTap(): void {
    const c = getCtx()
    if (!c) return
    ensureRunning()
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sawtooth'
    osc.frequency.value = 150
    gain.gain.setValueAtTime(0.3, c.currentTime)
    gain.gain.linearRampToValueAtTime(0, c.currentTime + 0.2)
    osc.connect(gain)
    gain.connect(c.destination)
    osc.start()
    osc.stop(c.currentTime + 0.2)
  },

  playGameOver(frequencies: ReadonlyArray<number>): void {
    const c = getCtx()
    if (!c) return
    ensureRunning()
    frequencies.forEach((freq, i) => {
      const osc = c.createOscillator()
      const gain = c.createGain()
      const start = c.currentTime + i * 0.1
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.15, start)
      gain.gain.linearRampToValueAtTime(0, start + 0.08)
      osc.connect(gain)
      gain.connect(c.destination)
      osc.start(start)
      osc.stop(start + 0.1)
    })
  },

  playVictory(frequencies: ReadonlyArray<number>): void {
    const c = getCtx()
    if (!c) return
    ensureRunning()
    const fadeEnd = c.currentTime + 1.0
    for (const freq of frequencies) {
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.1, c.currentTime)
      gain.gain.linearRampToValueAtTime(0, fadeEnd)
      osc.connect(gain)
      gain.connect(c.destination)
      osc.start()
      osc.stop(fadeEnd + 0.05)
    }
  },

  playUrgentBeep(): void {
    const c = getCtx()
    if (!c) return
    ensureRunning()
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.frequency.value = 1000
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.2, c.currentTime)
    gain.gain.linearRampToValueAtTime(0, c.currentTime + 0.1)
    osc.connect(gain)
    gain.connect(c.destination)
    osc.start()
    osc.stop(c.currentTime + 0.1)
  },
}
