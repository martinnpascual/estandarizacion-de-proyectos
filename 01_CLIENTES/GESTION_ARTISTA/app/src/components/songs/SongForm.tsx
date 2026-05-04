"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2, Plus, FolderOpen, Music, Sparkles, Zap, CheckCircle2, AlertCircle } from "lucide-react";
import { SongSchema, type SongFormData } from "@/lib/schemas";
import type { Song } from "@/types/database";
import DriveBrowser, { type DriveFile } from "@/components/drive/DriveBrowser";
import CoverArtUploader from "@/components/cover/CoverArtUploader";
import { useAudioAnalysis } from "@/hooks/useAudioAnalysis";

type FormErrors = Partial<Record<keyof SongFormData | "root", string>>;

interface SongFormProps {
  song?: Song;
  artistName?: string;
  onClose: () => void;
  onSaved: (song: Song) => void;
}

const CURRENT_YEAR = new Date().getFullYear();

const GENRES = [
  "Trap",
  "Reggaeton",
  "Hip Hop",
  "R&B",
  "Pop",
  "Drill",
  "Dancehall",
  "Afrobeats",
  "Otro",
];

const KEY_SIGNATURES = [
  "C mayor", "G mayor", "D mayor", "A mayor", "E mayor", "B mayor",
  "F# mayor", "C# mayor", "F mayor", "Bb mayor", "Eb mayor", "Ab mayor",
  "A menor", "E menor", "B menor", "F# menor", "C# menor", "G# menor",
  "D menor", "G menor", "C menor", "F menor", "Bb menor", "Eb menor",
];

const EMPTY_FORM: SongFormData = {
  title: "",
  artist_name: "BERTIAKA",
  featuring: [],
  year: CURRENT_YEAR,
  genre: null,
  duration_seconds: null,
  bpm: null,
  key_signature: null,
  cover_art_url: null,
  drive_file_id: null,
  drive_file_url: null,
  spotify_url: null,
  youtube_url: null,
  apple_music_url: null,
  soundcloud_url: null,
  tags: [],
  lyrics: null,
};

function songToForm(song: Song): SongFormData {
  return {
    title: song.title,
    artist_name: song.artist_name,
    featuring: song.featuring ?? [],
    year: song.year,
    genre: song.genre,
    duration_seconds: song.duration_seconds,
    bpm: song.bpm ?? null,
    key_signature: song.key_signature ?? null,
    cover_art_url: song.cover_art_url,
    drive_file_id: song.drive_file_id,
    drive_file_url: song.drive_file_url,
    spotify_url: song.spotify_url,
    youtube_url: song.youtube_url,
    apple_music_url: song.apple_music_url,
    soundcloud_url: song.soundcloud_url,
    tags: song.tags ?? [],
    lyrics: song.lyrics ?? null,
  };
}

// ── Duration helpers ──────────────────────────────────────────────────────────
function secondsToMMSS(seconds: number | null): string {
  if (seconds == null) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function parseMMSS(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.includes(":")) {
    const parts = trimmed.split(":");
    const m = parseInt(parts[0], 10);
    const s = parseInt(parts[1] ?? "0", 10);
    if (isNaN(m) || isNaN(s) || s >= 60) return null;
    return m * 60 + s;
  }
  const n = parseInt(trimmed, 10);
  return isNaN(n) || n <= 0 ? null : n;
}

export default function SongForm({ song, artistName, onClose, onSaved }: SongFormProps) {
  const [form, setForm] = useState<SongFormData>(
    song ? songToForm(song) : { ...EMPTY_FORM, artist_name: artistName ?? EMPTY_FORM.artist_name }
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [featureInput, setFeatureInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [durationInput, setDurationInput] = useState<string>(secondsToMMSS(song?.duration_seconds ?? null));
  const [justDetected, setJustDetected] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const { analyzing, phase, error: analysisError, analyze, reset: resetAnalysis } = useAudioAnalysis();

  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 50);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !showDrivePicker) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  function set<K extends keyof SongFormData>(key: K, value: SongFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function addFeaturing() {
    const name = featureInput.trim();
    if (!name || form.featuring.includes(name)) return;
    set("featuring", [...form.featuring, name]);
    setFeatureInput("");
  }

  function removeFeaturing(name: string) {
    set(
      "featuring",
      form.featuring.filter((f) => f !== name)
    );
  }

  function addTag() {
    const tag = tagInput.trim();
    if (!tag || form.tags.includes(tag)) return;
    set("tags", [...form.tags, tag]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    set(
      "tags",
      form.tags.filter((t) => t !== tag)
    );
  }

  async function handleDetect() {
    if (!form.drive_file_url) return;
    setJustDetected(false);
    resetAnalysis();
    const result = await analyze(form.drive_file_url);
    if (result) {
      set("bpm", result.bpm);
      set("key_signature", result.key);
      setJustDetected(true);
      setTimeout(() => setJustDetected(false), 4000);
    }
  }

  function nullableUrl(val: string): string | null {
    const trimmed = val.trim();
    return trimmed === "" ? null : trimmed;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const parsed = SongSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: FormErrors = {};
      parsed.error.errors.forEach((err) => {
        const key = err.path[0] as keyof SongFormData;
        if (!fieldErrors[key]) fieldErrors[key] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      let result: { data: Song | null; error: string | null };

      if (song) {
        const { updateSong } = await import("@/lib/actions/songs");
        result = await updateSong(song.id, parsed.data);
      } else {
        const { createSong } = await import("@/lib/actions/songs");
        result = await createSong(parsed.data);
      }

      if (result.error || !result.data) {
        setErrors({ root: result.error ?? "Error desconocido" });
      } else {
        onSaved(result.data);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-card/90 backdrop-blur-xl border border-border/60 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-[0_32px_80px_hsl(0_0%_0%/0.5)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur-xl z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20">
              <Music className="h-3.5 w-3.5 text-primary" />
            </div>
            <h2 className="text-sm font-semibold">
              {song ? "Editar canción" : "Nueva canción"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-secondary/60 transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {errors.root && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-xl">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {errors.root}
            </div>
          )}

          {/* Título */}
          <Field label="Título *" error={errors.title}>
            <input
              ref={titleRef}
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Nombre de la canción"
              className={inputClass(!!errors.title)}
            />
          </Field>

          {/* Artista */}
          <Field label="Artista *" error={errors.artist_name}>
            <input
              type="text"
              value={form.artist_name}
              onChange={(e) => set("artist_name", e.target.value)}
              placeholder="Nombre del artista"
              className={inputClass(!!errors.artist_name)}
            />
          </Field>

          {/* Año + Género */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Año *" error={errors.year}>
              <input
                type="number"
                value={form.year}
                onChange={(e) => set("year", Number(e.target.value))}
                min={1900}
                max={2100}
                className={inputClass(!!errors.year)}
              />
            </Field>
            <Field label="Género" error={errors.genre}>
              <select
                value={form.genre ?? ""}
                onChange={(e) =>
                  set("genre", e.target.value === "" ? null : e.target.value)
                }
                className={inputClass(false)}
              >
                <option value="">Sin género</option>
                {GENRES.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* Duración + Cover Art */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Duración (mm:ss)" error={errors.duration_seconds}>
              <input
                type="text"
                value={durationInput}
                onChange={(e) => {
                  setDurationInput(e.target.value);
                  const secs = parseMMSS(e.target.value);
                  set("duration_seconds", secs);
                }}
                onBlur={() => {
                  const secs = parseMMSS(durationInput);
                  setDurationInput(secs != null ? secondsToMMSS(secs) : durationInput);
                }}
                placeholder="3:45"
                className={inputClass(!!errors.duration_seconds)}
              />
            </Field>
            <div>
              <CoverArtUploader
                value={form.cover_art_url}
                onChange={(url) => set("cover_art_url", url)}
                label="Portada"
                size="md"
              />
              {errors.cover_art_url && (
                <p className="text-red-400 text-xs mt-1">{errors.cover_art_url}</p>
              )}
            </div>
          </div>

          {/* BPM + Tonalidad con detección automática */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">BPM y Tonalidad</span>

              {form.drive_file_url ? (
                <button
                  type="button"
                  onClick={handleDetect}
                  disabled={analyzing}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border
                    disabled:opacity-60 disabled:cursor-not-allowed
                    bg-violet-500/10 border-violet-500/25 text-violet-400 hover:bg-violet-500/20"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {phase || "Analizando…"}
                    </>
                  ) : justDetected ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 text-green-400" />
                      <span className="text-green-400">Detectado</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3" />
                      Detectar automáticamente
                    </>
                  )}
                </button>
              ) : (
                <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1">
                  <Zap className="h-2.5 w-2.5" />
                  Vinculá un audio para detectar
                </span>
              )}
            </div>

            {analysisError && (
              <div className="flex items-center gap-2 text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1.5 rounded-lg">
                <AlertCircle className="h-3 w-3 flex-shrink-0" />
                {analysisError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field label="BPM" error={errors.bpm}>
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={form.bpm ?? ""}
                  onChange={(e) =>
                    set("bpm", e.target.value === "" ? null : Math.round(Number(e.target.value)))
                  }
                  placeholder="120"
                  className={inputClass(!!errors.bpm) + (justDetected ? " ring-2 ring-green-500/40 border-green-500/40" : "")}
                />
              </Field>
              <Field label="Tonalidad" error={errors.key_signature}>
                <select
                  value={form.key_signature ?? ""}
                  onChange={(e) =>
                    set("key_signature", e.target.value === "" ? null : e.target.value)
                  }
                  className={inputClass(false) + (justDetected ? " ring-2 ring-green-500/40 border-green-500/40" : "")}
                >
                  <option value="">Sin especificar</option>
                  {KEY_SIGNATURES.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          {/* Featuring */}
          <Field label="Featuring" error={undefined}>
            <div className="space-y-2">
              {form.featuring.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.featuring.map((name) => (
                    <span
                      key={name}
                      className="flex items-center gap-1 px-2.5 py-0.5 bg-secondary/60 border border-border/40 rounded-full text-xs"
                    >
                      {name}
                      <button
                        type="button"
                        onClick={() => removeFeaturing(name)}
                        className="hover:text-destructive ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addFeaturing();
                    }
                  }}
                  placeholder="Agregar artista..."
                  className={inputClass(false) + " flex-1"}
                />
                <button
                  type="button"
                  onClick={addFeaturing}
                  className="p-2 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors border border-border/40"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Field>

          {/* Tags */}
          <Field label="Tags" error={undefined}>
            <div className="space-y-2">
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 px-2.5 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded-full text-xs"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-destructive ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="single, álbum track, remix..."
                  className={inputClass(false) + " flex-1"}
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="p-2 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors border border-border/40"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Field>

          {/* Links plataformas */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-border/40" />
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest px-1">
                Plataformas
              </p>
              <div className="flex-1 h-px bg-border/40" />
            </div>
            <div className="space-y-3">
              <Field label="Spotify" error={errors.spotify_url}>
                <input
                  type="url"
                  value={form.spotify_url ?? ""}
                  onChange={(e) => set("spotify_url", nullableUrl(e.target.value))}
                  placeholder="https://open.spotify.com/..."
                  className={inputClass(!!errors.spotify_url)}
                />
              </Field>
              <Field label="YouTube" error={errors.youtube_url}>
                <input
                  type="url"
                  value={form.youtube_url ?? ""}
                  onChange={(e) => set("youtube_url", nullableUrl(e.target.value))}
                  placeholder="https://youtube.com/..."
                  className={inputClass(!!errors.youtube_url)}
                />
              </Field>
              <Field label="Apple Music" error={errors.apple_music_url}>
                <input
                  type="url"
                  value={form.apple_music_url ?? ""}
                  onChange={(e) => set("apple_music_url", nullableUrl(e.target.value))}
                  placeholder="https://music.apple.com/..."
                  className={inputClass(!!errors.apple_music_url)}
                />
              </Field>
              <Field label="SoundCloud" error={errors.soundcloud_url}>
                <input
                  type="url"
                  value={form.soundcloud_url ?? ""}
                  onChange={(e) => set("soundcloud_url", nullableUrl(e.target.value))}
                  placeholder="https://soundcloud.com/..."
                  className={inputClass(!!errors.soundcloud_url)}
                />
              </Field>
            </div>
          </div>

          {/* Google Drive audio */}
          <Field label="Audio (Google Drive)" error={undefined}>
            {form.drive_file_url ? (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-green-500/5 border border-green-500/20 rounded-xl">
                <div className="w-6 h-6 rounded-lg bg-green-500/15 flex items-center justify-center flex-shrink-0">
                  <Music className="h-3.5 w-3.5 text-green-400" />
                </div>
                <span className="text-xs truncate flex-1 text-muted-foreground">
                  {form.drive_file_url.length > 48
                    ? "…" + form.drive_file_url.slice(-45)
                    : form.drive_file_url}
                </span>
                <button
                  type="button"
                  onClick={() => { set("drive_file_id", null); set("drive_file_url", null); }}
                  className="text-muted-foreground/50 hover:text-foreground flex-shrink-0 transition-colors"
                  title="Quitar archivo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDrivePicker(true)}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 bg-background/50 border border-dashed border-border/50 rounded-xl text-sm text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-primary/5 transition-all"
              >
                <FolderOpen className="h-4 w-4 text-primary/60" />
                Seleccionar desde Google Drive
              </button>
            )}
          </Field>

          {/* Acciones */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border/60 text-sm font-medium hover:bg-secondary/60 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_hsl(var(--primary)/0.25)]"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {song ? "Guardar cambios" : "Crear canción"}
            </button>
          </div>
        </form>
      </div>

      {showDrivePicker && (
        <DriveBrowser
          fileType="audio"
          onSelect={(file: DriveFile) => {
            set("drive_file_id", file.id);
            set("drive_file_url", `/api/drive/stream/${file.id}`);
            setShowDrivePicker(false);
          }}
          onClose={() => setShowDrivePicker(false)}
        />
      )}
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `w-full px-3 py-2.5 bg-background/50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all placeholder:text-muted-foreground/40 ${
    hasError ? "border-red-500/60" : "border-border/60"
  }`;
}
