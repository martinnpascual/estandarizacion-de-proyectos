/**
 * Audio analysis using Web Audio API + pure JS algorithms.
 * No external dependencies.
 *
 * - BPM: autocorrelation on onset-strength envelope
 * - Key: chromagram (FFT-based) + Krumhansl-Schmuckler profiles
 */

// ── Minimal Cooley-Tukey FFT ──────────────────────────────────────────────────

function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  // bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  // butterfly
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

/** Mix AudioBuffer to mono Float32Array, capped at maxSeconds */
function toMono(buf: AudioBuffer, maxSeconds = 60): Float32Array {
  const sr = buf.sampleRate;
  const maxSamples = Math.min(buf.length, sr * maxSeconds);
  const mono = new Float32Array(maxSamples);
  const nc = buf.numberOfChannels;
  for (let c = 0; c < nc; c++) {
    const ch = buf.getChannelData(c);
    for (let i = 0; i < maxSamples; i++) mono[i] += ch[i] / nc;
  }
  return mono;
}

/** Downsample by integer factor (simple averaging) */
function downsample(signal: Float32Array, factor: number): Float32Array {
  const out = new Float32Array(Math.floor(signal.length / factor));
  for (let i = 0; i < out.length; i++) {
    let sum = 0;
    for (let j = 0; j < factor; j++) sum += signal[i * factor + j];
    out[i] = sum / factor;
  }
  return out;
}

/** Next power of two >= n */
function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

// ── BPM Detection ─────────────────────────────────────────────────────────────

/** Tiny helper — yields to the event loop so the browser stays responsive */
function yieldToMain(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Detect BPM from an AudioBuffer using autocorrelation on the onset-strength
 * envelope. Targets the 60–180 BPM range common in urban/electronic music.
 * Async so the two large FFTs yield to the browser between them.
 */
export async function detectBPM(audioBuffer: AudioBuffer): Promise<number> {
  const sr = audioBuffer.sampleRate;

  // Work with a low-sample-rate mono signal (~4 kHz is plenty for beats)
  const factor = Math.max(1, Math.round(sr / 4000));
  const mono = toMono(audioBuffer, 120);
  const ds = downsample(mono, factor);
  const dsr = sr / factor; // effective sample rate after downsample

  // Onset strength: rectified energy difference between frames
  const hopSamples = Math.round(dsr * 0.01); // 10 ms
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

  await yieldToMain(); // yield before the large forward FFT

  // Autocorrelation via FFT for speed
  const fftSize = nextPow2(onset.length * 2);
  const re = new Float64Array(fftSize);
  const im = new Float64Array(fftSize);
  for (let i = 0; i < onset.length; i++) re[i] = onset[i];

  fft(re, im);

  await yieldToMain(); // yield between forward and inverse FFT

  // Power spectrum
  for (let i = 0; i < fftSize; i++) {
    re[i] = re[i] * re[i] + im[i] * im[i];
    im[i] = 0;
  }

  // Inverse FFT (conjugate → FFT → divide by N)
  for (let i = 1; i < fftSize; i++) {
    re[i] = re[fftSize - i]; // conjugate symmetry of real input
    im[i] = 0;
  }
  fft(re, im);
  const acf = re; // autocorrelation function

  await yieldToMain(); // yield after inverse FFT before peak search

  // Convert lag range to BPM range [60, 180]
  const fps = dsr / hopSamples;
  const lagMin = Math.round(fps * 60 / 180);
  const lagMax = Math.round(fps * 60 / 60);

  let bestLag = lagMin;
  let bestVal = -Infinity;
  for (let lag = lagMin; lag <= Math.min(lagMax, acf.length / 2 - 1); lag++) {
    if (acf[lag] > bestVal) {
      bestVal = acf[lag];
      bestLag = lag;
    }
  }

  const rawBPM = (fps * 60) / bestLag;

  // Resolve octave ambiguity: pick the candidate in [80, 180] if possible
  const candidates = [rawBPM / 2, rawBPM, rawBPM * 2].map(Math.round);
  for (const c of candidates) {
    if (c >= 80 && c <= 175) return c;
  }
  return Math.max(60, Math.min(200, Math.round(rawBPM)));
}

// ── Key Detection ─────────────────────────────────────────────────────────────

// Krumhansl-Schmuckler key profiles
const MAJOR_KS = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_KS = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

const NOTE_EN = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** Map English key name → Spanish display name used in the app */
const EN_TO_ES: Record<string, string> = {
  "C major":  "C mayor",  "G major":  "G mayor",  "D major":  "D mayor",
  "A major":  "A mayor",  "E major":  "E mayor",  "B major":  "B mayor",
  "F# major": "F# mayor", "C# major": "C# mayor", "F major":  "F mayor",
  "A# major": "Bb mayor", "D# major": "Eb mayor", "G# major": "Ab mayor",
  "A minor":  "A menor",  "E minor":  "E menor",  "B minor":  "B menor",
  "F# minor": "F# menor", "C# minor": "C# menor", "G# minor": "G# menor",
  "D minor":  "D menor",  "G minor":  "G menor",  "C minor":  "C menor",
  "F minor":  "F menor",  "A# minor": "Bb menor", "D# minor": "Eb menor",
};

function pearson(a: number[], b: number[]): number {
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

/**
 * Detect key signature from an AudioBuffer.
 * Returns a Spanish key name matching the app's KEY_SIGNATURES list.
 */
export async function detectKey(audioBuffer: AudioBuffer): Promise<string> {
  const sr = audioBuffer.sampleRate;
  const mono = toMono(audioBuffer, 60);

  const frameSize = 8192; // large frame for good frequency resolution
  const hopSize = 4096;
  const chroma = new Array<number>(12).fill(0);
  let frames = 0;

  for (let start = 0; start + frameSize < mono.length; start += hopSize) {
    const N = frameSize;
    const re = new Float64Array(N);
    const im = new Float64Array(N);

    // Hann-windowed frame
    for (let i = 0; i < N; i++) {
      const w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N - 1)));
      re[i] = mono[start + i] * w;
    }

    fft(re, im);

    // Map frequency bins to chroma (pitch classes 0-11)
    for (let bin = 1; bin < N / 2; bin++) {
      const freq = (bin * sr) / N;
      if (freq < 65 || freq > 2100) continue; // C2–C7 range

      const mag = Math.sqrt(re[bin] * re[bin] + im[bin] * im[bin]);
      if (mag < 1e-6) continue;

      // MIDI note number (A4 = 440 Hz = MIDI 69)
      const midi = 12 * Math.log2(freq / 440) + 69;
      const pitchClass = ((Math.round(midi) % 12) + 12) % 12;
      chroma[pitchClass] += mag;
    }

    frames++;
    if (frames % 30 === 0) await yieldToMain(); // yield every 30 frames to keep browser responsive
    if (frames >= 600) break; // cap at ~56 s (hopSize 4096 / 44100 Hz × 600 ≈ 55.7 s)
  }

  // Normalize chroma
  const maxC = Math.max(...chroma);
  if (maxC > 0) chroma.forEach((_, i) => { chroma[i] /= maxC; });

  // Find best matching key via Krumhansl-Schmuckler
  let bestKey = "C major";
  let bestScore = -Infinity;

  for (let root = 0; root < 12; root++) {
    const rotated = [...chroma.slice(root), ...chroma.slice(0, root)];
    const majorScore = pearson(rotated, MAJOR_KS);
    const minorScore = pearson(rotated, MINOR_KS);

    if (majorScore > bestScore) { bestScore = majorScore; bestKey = `${NOTE_EN[root]} major`; }
    if (minorScore > bestScore) { bestScore = minorScore; bestKey = `${NOTE_EN[root]} minor`; }
  }

  return EN_TO_ES[bestKey] ?? bestKey;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface AudioAnalysisResult {
  bpm: number;
  key: string;
}

/**
 * Spawn a Web Worker and resolve when it posts back a result.
 * The worker runs all heavy FFT work off the main thread — the UI
 * stays fully responsive and Chrome never kills the tab.
 */
function analyzeWithWorker(
  mono: Float32Array,
  sampleRate: number,
  onPhase?: (phase: string) => void,
): Promise<AudioAnalysisResult> {
  return new Promise<AudioAnalysisResult>((resolve, reject) => {
    const worker = new Worker("/audio-worker.js");

    worker.onmessage = (e: MessageEvent) => {
      const { type } = e.data as { type: string; phase?: string; bpm?: number; key?: string; message?: string };
      if (type === "progress") {
        onPhase?.(e.data.phase);
      } else if (type === "result") {
        worker.terminate();
        resolve({ bpm: e.data.bpm, key: e.data.key });
      } else if (type === "error") {
        worker.terminate();
        reject(new Error(e.data.message));
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(new Error(`Worker error: ${err.message}`));
    };

    // Transfer the buffer to avoid copying large PCM data
    worker.postMessage({ type: "analyze", monoData: mono, sampleRate }, [mono.buffer]);
  });
}

/**
 * Run BPM + key analysis on a decoded AudioBuffer using a Web Worker.
 */
export async function analyzeAudioBuffer(audioBuffer: AudioBuffer): Promise<AudioAnalysisResult> {
  const mono = toMono(audioBuffer, 120);
  return analyzeWithWorker(mono, audioBuffer.sampleRate);
}

/**
 * Stream only the first `maxBytes` of a URL.
 * Avoids downloading huge audio files — 3 MB is ~75-180 s of MP3,
 * which is more than enough for BPM + key analysis.
 */
async function fetchPartialAudio(
  url: string,
  maxBytes = 3 * 1024 * 1024, // 3 MB
): Promise<ArrayBuffer> {
  const res = await fetch(url, {
    headers: { Range: `bytes=0-${maxBytes - 1}` },
  });
  if (!res.ok && res.status !== 206) {
    throw new Error(`No se pudo descargar el audio (${res.status})`);
  }
  if (!res.body) throw new Error("Sin cuerpo de respuesta");

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
    if (total >= maxBytes) {
      await reader.cancel(); // stop the download — we have enough
      break;
    }
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.byteLength; }
  return out.buffer;
}

/**
 * Fetch audio from a URL, decode it, and run analysis via Web Worker.
 * Only the first 3 MB are downloaded — enough for ~75-180 s of MP3.
 * The main thread is free throughout — no blocking, no tab crashes.
 */
export async function analyzeAudioFromUrl(
  url: string,
  onPhase?: (phase: string) => void,
): Promise<AudioAnalysisResult> {
  onPhase?.("Descargando audio…");

  const arrayBuffer = await fetchPartialAudio(url);

  onPhase?.("Decodificando…");

  // Decode — if the truncated stream is rejected, retry with 8 MB
  let audioBuffer: AudioBuffer | null = null;
  for (const buf of [arrayBuffer, null] as (ArrayBuffer | null)[]) {
    const data = buf ?? (await fetchPartialAudio(url, 8 * 1024 * 1024));
    const ctx = new AudioContext();
    try {
      audioBuffer = await ctx.decodeAudioData(data);
      break; // success
    } catch {
      // try bigger chunk on next iteration
    } finally {
      ctx.close();
    }
  }
  if (!audioBuffer) throw new Error("No se pudo decodificar el audio");

  // Mix to mono on the main thread (fast), then hand off to worker
  const mono = toMono(audioBuffer, 120);
  return analyzeWithWorker(mono, audioBuffer.sampleRate, onPhase);
}
