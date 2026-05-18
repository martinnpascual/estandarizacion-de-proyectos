/**
 * Audio analysis
 *
 * - BPM  : `music-tempo` library — more accurate than custom autocorrelation,
 *           especially on trap / urban beats with complex kick patterns.
 *           Runs on the main thread (fast, no blocking UI).
 *
 * - Key  : chromagram (FFT) + Krumhansl-Schmuckler profiles.
 *           Delegated to a Web Worker so the browser stays responsive
 *           during the CPU-heavy frame-by-frame FFT pass.
 */

// music-tempo ships without TypeScript declarations — suppress the error.
// @ts-ignore
import MusicTempo from "music-tempo";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AudioAnalysisResult {
  bpm: number;
  key: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Mix all channels of an AudioBuffer down to a mono Float32Array. */
function toMono(buf: AudioBuffer, maxSeconds = 120): Float32Array {
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

// ── BPM via music-tempo ───────────────────────────────────────────────────────

/**
 * Detect BPM using the `music-tempo` library.
 * The library uses a filter-bank + autocorrelation approach that handles
 * syncopated rhythms far better than a single-band onset autocorrelator.
 *
 * Falls back to 120 BPM if the audio has no detectable rhythmic peaks
 * (e.g. silence, pure ambient / spoken word with no beat).
 */
function detectBPM(mono: Float32Array, sampleRate: number): number {
  let raw: number;
  try {
    const mt = new MusicTempo(mono, { sampleRate }) as { tempo: number };
    raw = mt.tempo;
  } catch {
    // music-tempo throws "Fail to find peaks" on audio without a clear beat
    return 120; // sensible default
  }

  // Resolve octave ambiguity — prefer a result in the [80, 175] BPM range
  // typical of urban / electronic music.
  const candidates = [raw / 2, raw, raw * 2].map(Math.round);
  for (const c of candidates) {
    if (c >= 80 && c <= 175) return c;
  }
  return Math.max(60, Math.min(200, Math.round(raw)));
}

// ── Key detection via Web Worker ──────────────────────────────────────────────

/**
 * Send the mono PCM data to the audio worker for key detection.
 * The worker runs a full chromagram (frame-by-frame FFT) and matches
 * against Krumhansl-Schmuckler key profiles, returning a Spanish key name.
 */
function detectKeyWithWorker(
  mono: Float32Array,
  sampleRate: number,
  onPhase?: (phase: string) => void
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const worker = new Worker("/audio-worker.js");

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data as {
        type: string;
        phase?: string;
        key?: string;
        message?: string;
      };
      if (msg.type === "progress") {
        onPhase?.(msg.phase ?? "Analizando…");
      } else if (msg.type === "result") {
        worker.terminate();
        resolve(msg.key ?? "");
      } else if (msg.type === "error") {
        worker.terminate();
        reject(new Error(msg.message ?? "Error en el worker"));
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(new Error(`Worker error: ${err.message}`));
    };

    // Transfer the buffer for zero-copy handoff — caller must pass a copy
    // if it still needs the data after this call.
    worker.postMessage(
      { type: "detectKey", monoData: mono, sampleRate },
      [mono.buffer]
    );
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Analyse an already-decoded AudioBuffer.
 * BPM runs synchronously on the main thread (music-tempo is fast).
 * Key runs asynchronously in a Web Worker (chromagram FFT is heavy).
 */
export async function analyzeAudioBuffer(
  audioBuffer: AudioBuffer
): Promise<AudioAnalysisResult> {
  const mono = toMono(audioBuffer, 120);

  // BPM — reads from mono without consuming the buffer
  const bpm = detectBPM(mono, audioBuffer.sampleRate);

  // Key — worker transfers buffer ownership, so pass a copy
  const monoCopy = mono.slice();
  const key = await detectKeyWithWorker(monoCopy, audioBuffer.sampleRate);

  return { bpm, key };
}

/**
 * Stream only the first `maxBytes` of a remote URL.
 * 3 MB ≈ 75–180 s of typical MP3 — more than enough for analysis.
 */
async function fetchPartialAudio(
  url: string,
  maxBytes = 3 * 1024 * 1024
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
      await reader.cancel();
      break;
    }
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out.buffer;
}

/**
 * Fetch audio from a URL, decode it, and run BPM + key analysis.
 *
 * Only the first 3 MB are downloaded (≈ 75–180 s of MP3).
 * If the truncated stream can't be decoded, retries with 8 MB.
 * The main thread stays free throughout — no blocking, no tab kills.
 */
export async function analyzeAudioFromUrl(
  url: string,
  onPhase?: (phase: string) => void
): Promise<AudioAnalysisResult> {
  onPhase?.("Descargando audio…");
  const arrayBuffer = await fetchPartialAudio(url);

  onPhase?.("Decodificando…");
  let audioBuffer: AudioBuffer | null = null;
  for (const buf of [arrayBuffer, null] as (ArrayBuffer | null)[]) {
    const data = buf ?? (await fetchPartialAudio(url, 8 * 1024 * 1024));
    const ctx = new AudioContext();
    try {
      audioBuffer = await ctx.decodeAudioData(data);
      break;
    } catch {
      // try with the larger 8 MB chunk on the next iteration
    } finally {
      ctx.close();
    }
  }
  if (!audioBuffer) throw new Error("No se pudo decodificar el audio");

  onPhase?.("Detectando BPM…");
  const mono = toMono(audioBuffer, 120);
  const bpm = detectBPM(mono, audioBuffer.sampleRate);

  onPhase?.("Detectando tonalidad…");
  const monoCopy = mono.slice();
  const key = await detectKeyWithWorker(monoCopy, audioBuffer.sampleRate, onPhase);

  return { bpm, key };
}
