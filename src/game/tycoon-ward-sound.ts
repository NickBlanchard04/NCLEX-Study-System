/** Quiet synthesized cues; no media downloads or autoplay before a user gesture. */
export class WardSound {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private enabled = true
  private paused = false
  unlock() {
    if (!this.enabled) return
    try {
      if (!this.context) {
        this.context = new AudioContext()
        this.master = this.context.createGain()
        this.master.gain.value = this.paused ? 0 : 0.18
        this.master.connect(this.context.destination)
      }
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {})
    } catch { /* Audio is optional on devices without Web Audio. */ }
  }
  configure(enabled: boolean, paused: boolean) {
    if (this.enabled === enabled && this.paused === paused) return
    this.enabled = enabled; this.paused = paused
    if (this.master && this.context) this.master.gain.setValueAtTime(enabled && !paused ? 0.18 : 0, this.context.currentTime)
  }
  cue(kind: 'step' | 'step-soft' | 'wheel' | 'scan' | 'bell' | 'complete') {
    const ctx = this.context, master = this.master
    if (!this.enabled || this.paused || !ctx || !master || ctx.state !== 'running') return
    const surface = kind === 'step' || kind === 'step-soft' || kind === 'wheel'
    const notes = kind === 'wheel' ? [62] : kind === 'step-soft' ? [82] : kind === 'step' ? [125] : kind === 'scan' ? [960] : kind === 'bell' ? [660, 880] : [523, 659, 784]
    notes.forEach((frequency, index) => {
      const start = ctx.currentTime + index * 0.11, length = surface ? kind === 'wheel' ? 0.16 : 0.045 : 0.12
      const oscillator = ctx.createOscillator(), gain = ctx.createGain()
      oscillator.type = surface ? 'triangle' : 'sine'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0, start)
      gain.gain.linearRampToValueAtTime(surface ? kind === 'wheel' ? 0.035 : kind === 'step-soft' ? 0.09 : 0.15 : 0.35, start + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.001, start + length)
      oscillator.connect(gain); gain.connect(master)
      oscillator.start(start); oscillator.stop(start + length)
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect() }
    })
  }
  destroy() { if (this.context) void this.context.close().catch(() => {}); this.context = null; this.master = null }
}
