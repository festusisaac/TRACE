"use client";

/**
 * Modern Command Center Chime (Bloomberg / Enterprise Fintech Alert)
 * Produces an authoritative, rich, multi-harmonic acoustic chime.
 * Free of harsh square/sawtooth buzzing; uses pure sine & harmonic warmth
 * with smooth biquad filtering for a sleek, premium, executive alert.
 */

let sharedAudioCtx: AudioContext | null = null;
let activeLoopInterval: NodeJS.Timeout | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Plays an authoritative, high-tech dual-tone command center chime:
 * Strike 1: Crisp primary glass bell (G5 784Hz + harmonic shimmer)
 * Strike 2: Resonant resolution bell (C6 1046Hz + C5 warm body)
 */
export function playEmergencyAlarm(options?: { volume?: number }) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const baseVolume = options?.volume ?? 0.30;
  const now = ctx.currentTime;

  // Master low-pass filter to ensure silky acoustic warmth and remove digital click
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(3200, now);
  filter.connect(ctx.destination);

  // Multi-harmonic chime voices
  // Tone 1: Initial alert strike at t = 0.0s
  // Tone 2: Harmonious high-priority resolution at t = 0.16s
  const voices = [
    // Strike 1 (784 Hz G5 primary + 1568 Hz overtone)
    { start: 0.0, freq: 783.99, gainMult: 1.0, decay: 0.45 },
    { start: 0.0, freq: 1567.98, gainMult: 0.35, decay: 0.30 },

    // Strike 2 (1046.5 Hz C6 primary + 523.25 Hz C5 warm body + 2093 Hz sparkle)
    { start: 0.16, freq: 1046.5, gainMult: 1.0, decay: 0.70 },
    { start: 0.16, freq: 523.25, gainMult: 0.6, decay: 0.65 },
    { start: 0.16, freq: 2093.0, gainMult: 0.25, decay: 0.40 },
  ];

  voices.forEach(({ start, freq, gainMult, decay }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, now + start);

    const peakGain = baseVolume * gainMult;

    // Smooth bell envelope: quick 12ms attack, smooth exponential decay
    gain.gain.setValueAtTime(0.0001, now + start);
    gain.gain.exponentialRampToValueAtTime(peakGain, now + start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + start + decay);

    osc.connect(gain);
    gain.connect(filter);

    osc.start(now + start);
    osc.stop(now + start + decay + 0.05);
  });
}

/**
 * Plays the command center alert in a dignified 4.2s loop while active
 */
export function startEmergencyAlarmLoop(options?: { volume?: number }) {
  if (typeof window === "undefined") return;
  stopEmergencyAlarmLoop();
  playEmergencyAlarm(options);
  activeLoopInterval = setInterval(() => {
    playEmergencyAlarm(options);
  }, 2000);
}

/**
 * Stops continuous emergency loop
 */
export function stopEmergencyAlarmLoop() {
  if (activeLoopInterval) {
    clearInterval(activeLoopInterval);
    activeLoopInterval = null;
  }
}
