// Fully offline procedural audio using Web Audio API.
// Provides a dark mystical ambient drone + wolf howl + day chime.

const SOUND_KEY = "lg.sound";

type Ctx = {
  ac: AudioContext;
  master: GainNode;
  ambientOn: boolean;
  ambientNodes: { stop: () => void } | null;
};

let ctx: Ctx | null = null;

function ensure(): Ctx {
  if (ctx) return ctx;
  const AC = (window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
  const ac = new AC();
  const master = ac.createGain();
  master.gain.value = 0.55;
  master.connect(ac.destination);
  ctx = { ac, master, ambientOn: false, ambientNodes: null };
  return ctx;
}

async function resume() {
  const c = ensure();
  if (c.ac.state === "suspended") await c.ac.resume();
  return c;
}

// ---------- Ambient mystical drone ----------
function startAmbient() {
  const c = ensure();
  if (c.ambientNodes) return;

  const { ac, master } = c;
  const bus = ac.createGain();
  bus.gain.value = 0;
  bus.gain.linearRampToValueAtTime(0.35, ac.currentTime + 3);

  // Lowpass to keep it soft
  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 620;
  lp.Q.value = 0.6;
  bus.connect(lp).connect(master);

  // Detuned drone oscillators (low D minor-ish stack)
  const freqs = [55, 82.5, 110, 146.83, 220];
  const oscs: OscillatorNode[] = [];
  const gains: GainNode[] = [];
  freqs.forEach((f, i) => {
    const o = ac.createOscillator();
    o.type = i % 2 === 0 ? "sine" : "triangle";
    o.frequency.value = f;
    o.detune.value = (Math.random() - 0.5) * 12;
    const g = ac.createGain();
    g.gain.value = 0.18 / (i + 1);
    o.connect(g).connect(bus);
    o.start();
    oscs.push(o);
    gains.push(g);

    // Slow LFO on gain for breathing
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.05 + Math.random() * 0.08;
    const lfoGain = ac.createGain();
    lfoGain.gain.value = g.gain.value * 0.6;
    lfo.connect(lfoGain).connect(g.gain);
    lfo.start();
    oscs.push(lfo);
  });

  // Soft wind noise
  const bufSize = 2 * ac.sampleRate;
  const noiseBuf = ac.createBuffer(1, bufSize, ac.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
  const noise = ac.createBufferSource();
  noise.buffer = noiseBuf;
  noise.loop = true;
  const nFilter = ac.createBiquadFilter();
  nFilter.type = "bandpass";
  nFilter.frequency.value = 380;
  nFilter.Q.value = 0.4;
  const nGain = ac.createGain();
  nGain.gain.value = 0.06;
  noise.connect(nFilter).connect(nGain).connect(bus);
  noise.start();

  // Sparse distant howls
  let howlTimer: number | null = null;
  const scheduleHowl = () => {
    const delay = 18000 + Math.random() * 22000;
    howlTimer = window.setTimeout(() => {
      playHowl(0.25);
      scheduleHowl();
    }, delay);
  };
  scheduleHowl();

  c.ambientNodes = {
    stop: () => {
      const t = ac.currentTime;
      bus.gain.cancelScheduledValues(t);
      bus.gain.linearRampToValueAtTime(0, t + 1.2);
      setTimeout(() => {
        oscs.forEach((o) => {
          try { o.stop(); } catch { /* ignore */ }
          o.disconnect();
        });
        try { noise.stop(); } catch { /* ignore */ }
        noise.disconnect();
        bus.disconnect();
      }, 1400);
      if (howlTimer) clearTimeout(howlTimer);
    },
  };
  c.ambientOn = true;
}

function stopAmbient() {
  if (!ctx?.ambientNodes) return;
  ctx.ambientNodes.stop();
  ctx.ambientNodes = null;
  ctx.ambientOn = false;
}

// ---------- Wolf howl ----------
export function playHowl(volume = 0.6) {
  const c = ensure();
  const { ac, master } = c;
  const t0 = ac.currentTime;
  const dur = 3.2;

  const g = ac.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(volume, t0 + 0.6);
  g.gain.linearRampToValueAtTime(volume * 0.9, t0 + 1.8);
  g.gain.linearRampToValueAtTime(0, t0 + dur);

  const lp = ac.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1400;

  g.connect(lp).connect(master);

  // Main howl carrier
  const o = ac.createOscillator();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(180, t0);
  o.frequency.linearRampToValueAtTime(420, t0 + 0.8);
  o.frequency.linearRampToValueAtTime(520, t0 + 1.6);
  o.frequency.linearRampToValueAtTime(300, t0 + dur);

  // Vibrato
  const vib = ac.createOscillator();
  vib.frequency.value = 5.5;
  const vibG = ac.createGain();
  vibG.gain.value = 14;
  vib.connect(vibG).connect(o.frequency);

  // Sub layer
  const sub = ac.createOscillator();
  sub.type = "sine";
  sub.frequency.setValueAtTime(90, t0);
  sub.frequency.linearRampToValueAtTime(210, t0 + 0.8);
  sub.frequency.linearRampToValueAtTime(260, t0 + 1.6);
  sub.frequency.linearRampToValueAtTime(150, t0 + dur);
  const subG = ac.createGain();
  subG.gain.value = 0.5;
  sub.connect(subG).connect(g);

  o.connect(g);
  o.start(t0); sub.start(t0); vib.start(t0);
  o.stop(t0 + dur + 0.1); sub.stop(t0 + dur + 0.1); vib.stop(t0 + dur + 0.1);
}

// ---------- Day chime ----------
export function playChime(volume = 0.5) {
  const c = ensure();
  const { ac, master } = c;
  const t0 = ac.currentTime;
  const freqs = [523.25, 659.25, 783.99, 1046.5];
  freqs.forEach((f, i) => {
    const o = ac.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const g = ac.createGain();
    const start = t0 + i * 0.12;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(volume * 0.35, start + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 1.8);
    o.connect(g).connect(master);
    o.start(start);
    o.stop(start + 2);
  });
}

// ---------- Night whoosh ----------
export function playNightWhoosh(volume = 0.5) {
  const c = ensure();
  const { ac, master } = c;
  const t0 = ac.currentTime;
  const dur = 1.6;
  const bufSize = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(200, t0);
  filter.frequency.exponentialRampToValueAtTime(1200, t0 + dur * 0.6);
  filter.frequency.exponentialRampToValueAtTime(120, t0 + dur);
  filter.Q.value = 0.9;
  const g = ac.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(volume, t0 + 0.4);
  g.gain.linearRampToValueAtTime(0, t0 + dur);
  src.connect(filter).connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

// ---------- Public API ----------
export const audio = {
  isEnabled(): boolean {
    if (typeof window === "undefined") return true;
    const v = window.localStorage.getItem(SOUND_KEY);
    return v === null ? true : v === "1";
  },
  setEnabled(on: boolean) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SOUND_KEY, on ? "1" : "0");
    }
    if (on) {
      resume().then(() => startAmbient());
    } else {
      stopAmbient();
      if (ctx) ctx.master.gain.value = 0;
    }
    if (on && ctx) ctx.master.gain.value = 0.55;
  },
  async startAmbient() {
    if (!this.isEnabled()) return;
    await resume();
    startAmbient();
  },
  stopAmbient,
  howl: playHowl,
  chime: playChime,
  whoosh: playNightWhoosh,
};
