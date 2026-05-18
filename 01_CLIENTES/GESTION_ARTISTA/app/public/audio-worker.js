/**
 * audio-worker.js — Web Worker for key detection (and legacy BPM + key)
 *
 * Protocol:
 *   IN  { type: 'detectKey', monoData: Float32Array, sampleRate: number }
 *   OUT { type: 'progress', phase: string }
 *       { type: 'result',   key: string }
 *       { type: 'error',    message: string }
 *
 * Legacy (backward-compat):
 *   IN  { type: 'analyze',   monoData: Float32Array, sampleRate: number }
 *   OUT { type: 'result',    bpm: number, key: string }
 *
 * Note: BPM detection is now handled on the main thread via `music-tempo`.
 * This worker is responsible only for the CPU-heavy chromagram FFT pass
 * used for key detection.
 */

// ── Cooley-Tukey FFT ──────────────────────────────────────────────────────────

function fft(re, im) {
  const n = re.length;
  // Bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  // Butterfly
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0;
      for (let j = 0; j < len >> 1; j++) {
        const uRe = re[i + j];
        const uIm = im[i + j];
        const vRe = re[i + j + (len >> 1)] * curRe - im[i + j + (len >> 1)] * curIm;
        const vIm = re[i + j + (len >> 1)] * curIm + im[i + j + (len >> 1)] * curRe;
        re[i + j] = uRe + vRe;
        im[i + j] = uIm + vIm;
        re[i + j + (len >> 1)] = uRe - vRe;
        im[i + j + (len >> 1)] = uIm - vIm;
        const nr = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nr;
      }
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function downsample(signal, factor) {
  const out = new Float32Array(Math.floor(signal.length / factor));
  for (let i = 0; i < out.length; i++) {
    let sum = 0;
    for (let j = 0; j < factor; j++) sum += signal[i * factor + j];
    out[i] = sum / factor;
  }
  return out;
}

function nextPow2(n) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

// ── Legacy BPM Detection (used only by the 'analyze' message type) ────────────

function detectBPM(mono, sr) {
  const factor = Math.max(1, Math.round(sr / 4000));
  const maxSamples = Math.min(mono.length, sr * 120);
  const src = maxSamples < mono.length ? mono.slice(0, maxSamples) : mono;
  const ds = downsample(src, factor);
  const dsr = sr / factor;

  const hopSamples = Math.round(dsr * 0.01);    // 10 ms
  const frameSamples = Math.round(dsr * 0.025); // 25 ms
  const numFrames = Math.floor((ds.length - frameSamples) / hopSamples);
  const onset = new Float32Array(numFrames);

  let prevEnergy = 0;
  for (let f = 0; f < numFrames; f++) {
    const s = f * hopSamples;
    let energy = 0;
    for (let i = s; i < s + frameSamples; i++) energy += ds[i] * ds[i];
    energy = Math.sqrt(energy / frameSamples);
    onset[f] = Math.max(0, energy - prevEnergy);
    prevEnergy = energy;
  }

  const fftSize = nextPow2(onset.length * 2);
  const re = new Float64Array(fftSize);
  const im = new Float64Array(fftSize);
  for (let i = 0; i < onset.length; i++) re[i] = onset[i];
  fft(re, im);

  for (let i = 0; i < fftSize; i++) {
    re[i] = re[i] * re[i] + im[i] * im[i];
    im[i] = 0;
  }
  for (let i = 1; i < fftSize; i++) { re[i] = re[fftSize - i]; im[i] = 0; }
  fft(re, im);

  const fps = dsr / hopSamples;
  const lagMin = Math.round(fps * 60 / 180);
  const lagMax = Math.round(fps * 60 / 60);

  let bestLag = lagMin;
  let bestVal = -Infinity;
  for (let lag = lagMin; lag <= Math.min(lagMax, re.length / 2 - 1); lag++) {
    if (re[lag] > bestVal) { bestVal = re[lag]; bestLag = lag; }
  }

  const rawBPM = (fps * 60) / bestLag;
  const candidates = [rawBPM / 2, rawBPM, rawBPM * 2].map(Math.round);
  for (const c of candidates) {
    if (c >= 80 && c <= 175) return c;
  }
  return Math.max(60, Math.min(200, Math.round(rawBPM)));
}

// ── Key Detection ─────────────────────────────────────────────────────────────

const MAJOR_KS = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_KS = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const NOTE_EN  = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];

// Enharmonic-aware Spanish key names (A# → Bb, D# → Eb, G# → Ab)
const EN_TO_ES = {
  "C major":"C mayor",   "G major":"G mayor",   "D major":"D mayor",
  "A major":"A mayor",   "E major":"E mayor",   "B major":"B mayor",
  "F# major":"F# mayor", "C# major":"C# mayor", "F major":"F mayor",
  "A# major":"Bb mayor", "D# major":"Eb mayor", "G# major":"Ab mayor",
  "A minor":"A menor",   "E minor":"E menor",   "B minor":"B menor",
  "F# minor":"F# menor", "C# minor":"C# menor", "G# minor":"G# menor",
  "D minor":"D menor",   "G minor":"G menor",   "C minor":"C menor",
  "F minor":"F menor",   "A# minor":"Bb menor", "D# minor":"Eb menor",
};

function pearson(a, b) {
  const n = a.length;
  const ma = a.reduce((s, v) => s + v, 0) / n;
  const mb = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const ai = a[i] - ma, bi = b[i] - mb;
    num += ai * bi; da += ai * ai; db += bi * bi;
  }
  return da === 0 || db === 0 ? 0 : num / Math.sqrt(da * db);
}

function detectKey(mono, sr) {
  const maxSamples = Math.min(mono.length, sr * 60);
  const src = maxSamples < mono.length ? mono.slice(0, maxSamples) : mono;

  const frameSize = 8192;
  const hopSize   = 4096;
  const chroma    = new Array(12).fill(0);
  let frames = 0;

  for (let start = 0; start + frameSize < src.length; start += hopSize) {
    const re = new Float64Array(frameSize);
    const im = new Float64Array(frameSize);

    // Hann window
    for (let i = 0; i < frameSize; i++) {
      const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (frameSize - 1)));
      re[i] = src[start + i] * w;
    }

    fft(re, im);

    // Accumulate chromagram over C2–C7 range
    for (let bin = 1; bin < frameSize / 2; bin++) {
      const freq = (bin * sr) / frameSize;
      if (freq < 65 || freq > 2100) continue;
      const mag = Math.sqrt(re[bin] * re[bin] + im[bin] * im[bin]);
      if (mag < 1e-6) continue;
      const midi = 12 * Math.log2(freq / 440) + 69;
      const pc   = ((Math.round(midi) % 12) + 12) % 12;
      chroma[pc] += mag;
    }

    frames++;
    if (frames >= 600) break; // ~56 s
  }

  // Normalize
  const maxC = Math.max(...chroma);
  if (maxC > 0) chroma.forEach((_, i) => { chroma[i] /= maxC; });

  // Krumhansl-Schmuckler profile matching
  let bestKey   = "C major";
  let bestScore = -Infinity;
  for (let root = 0; root < 12; root++) {
    const rotated = [...chroma.slice(root), ...chroma.slice(0, root)];
    const maj = pearson(rotated, MAJOR_KS);
    const min = pearson(rotated, MINOR_KS);
    if (maj > bestScore) { bestScore = maj; bestKey = `${NOTE_EN[root]} major`; }
    if (min > bestScore) { bestScore = min; bestKey = `${NOTE_EN[root]} minor`; }
  }

  return EN_TO_ES[bestKey] ?? bestKey;
}

// ── Message handler ───────────────────────────────────────────────────────────

self.onmessage = function (e) {
  const { type, monoData, sampleRate } = e.data;

  try {
    if (type === 'detectKey') {
      // Primary path: key detection only (BPM is handled by music-tempo on
      // the main thread in audio-analysis.ts).
      self.postMessage({ type: 'progress', phase: 'Detectando tonalidad…' });
      const key = detectKey(monoData, sampleRate);
      self.postMessage({ type: 'result', key });

    } else if (type === 'analyze') {
      // Legacy path: full BPM + key (kept for backward compatibility).
      self.postMessage({ type: 'progress', phase: 'Detectando BPM…' });
      const bpm = detectBPM(monoData, sampleRate);
      self.postMessage({ type: 'progress', phase: 'Detectando tonalidad…' });
      const key = detectKey(monoData, sampleRate);
      self.postMessage({ type: 'result', bpm, key });
    }
  } catch (err) {
    self.postMessage({ type: 'error', message: err.message ?? 'Error en análisis' });
  }
};
