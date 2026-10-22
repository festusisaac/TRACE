"use client";

/**
 * Bank Operations Emergency Duress Alarm Synthesizer
 * Uses Web Audio API to create a loud, multi-frequency emergency klaxon beeping pattern.
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
 * Plays a single burst of 3 sharp, high-intensity emergency klaxon beeps:
 * Beep 1 (960Hz sawtooth) -> Beep 2 (960Hz sawtooth) -> Beep 3 (1200Hz square)
 */
export function playEmergencyAlarm(options?: { volume?: number }) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const baseVolume = options?.volume ?? 0.38;
  const now = ctx.currentTime;

  // Staccato dual-tone emergency klaxon pulses
  const pulses = [
    { start: 0.00, end: 0.12, freq: 960, type: "sawtooth" as OscillatorType },
    { start: 0.18, end: 0.30, freq: 960, type: "sawtooth" as OscillatorType },
    { start: 0.36, end: 0.58, freq: 1200, type: "square" as OscillatorType },
  ];

  pulses.forEach(({ start, end, freq, type }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now + start);

    // Punchy immediate attack and sharp decay
    gain.gain.setValueAtTime(0.001, now + start);
    gain.gain.exponentialRampToValueAtTime(baseVolume, now + start + 0.02);
    gain.gain.setValueAtTime(baseVolume, now + end - 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + end);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + start);
    osc.stop(now + end);
  });
}

/**
 * Starts continuous emergency beeping every 2.4 seconds
 */
export function startEmergencyAlarmLoop(options?: { volume?: number }) {
  if (typeof window === "undefined") return;
  stopEmergencyAlarmLoop();
  playEmergencyAlarm(options);
  activeLoopInterval = setInterval(() => {
    playEmergencyAlarm(options);
  }, 2400);
}

/**
 * Stops continuous emergency beeping
 */
export function stopEmergencyAlarmLoop() {
  if (activeLoopInterval) {
    clearInterval(activeLoopInterval);
    activeLoopInterval = null;
  }
}
