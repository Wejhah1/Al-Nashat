let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone(freq: number, start: number, duration: number, type: OscillatorType = 'sine', gain = 0.18) {
  const a = audio()
  if (!a) return
  const osc = a.createOscillator()
  const g = a.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(0, a.currentTime + start)
  g.gain.linearRampToValueAtTime(gain, a.currentTime + start + 0.015)
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + duration)
  osc.connect(g).connect(a.destination)
  osc.start(a.currentTime + start)
  osc.stop(a.currentTime + start + duration + 0.05)
}

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* غير مدعوم */
  }
}

/** يُستدعى عند أول تفاعل لفتح قناة الصوت في iOS */
export function unlockAudio() {
  audio()
}

export function playSuccess(enabled = true) {
  if (enabled) {
    tone(880, 0, 0.12)
    tone(1318.5, 0.1, 0.22)
  }
  vibrate(80)
}

export function playError(enabled = true) {
  if (enabled) {
    tone(220, 0, 0.18, 'square', 0.09)
    tone(180, 0.2, 0.3, 'square', 0.09)
  }
  vibrate([120, 80, 120])
}

export function playTap(enabled = true) {
  if (enabled) tone(1200, 0, 0.05, 'sine', 0.06)
}
