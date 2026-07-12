let audioCtx = null;

function getCtx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) {
    try {
      audioCtx = new AC();
    } catch {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}

function tone({ freq, freqEnd = null, type = 'sine', dur = 0.06, gain = 0.04 }) {
  const ctx = getCtx();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, now + dur);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(gain, now + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + dur + 0.03);
}

// Soft, low blip for generic button presses.
export function playClick() {
  tone({ freq: 523, type: 'triangle', dur: 0.038, gain: 0.03 });
}

// Rising sweep when a panel opens.
export function playMenuOpen() {
  tone({ freq: 300, freqEnd: 560, type: 'sine', dur: 0.16, gain: 0.035 });
}

// Falling sweep when a panel closes.
export function playMenuClose() {
  tone({ freq: 560, freqEnd: 280, type: 'sine', dur: 0.16, gain: 0.035 });
}

// Short filtered-noise tick for channel changes (TV static blip).
export function playChannelClick() {
  const ctx = getCtx();
  if (!ctx) return;
  const duration = 0.05;
  const buffer = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * duration), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.value = 1400;
  gain.gain.value = 0.02;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}
