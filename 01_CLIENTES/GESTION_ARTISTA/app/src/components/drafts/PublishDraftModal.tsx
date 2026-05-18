"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2, Upload, Music2, User, Tag, ExternalLink, CheckCircle2, StickyNote } from "lucide-react";
import type { Draft, Song } from "@/types/database";
import { cn } from "@/lib/utils";

interface PublishDraftModalProps {
  draft: Draft;
  artistName?: string;
  onClose: () => void;
  onPublished: (song: Song) => void;
}

interface PublishForm {
  title: string;
  artist_name: string;
  year: number;
  featuring: string;
  genre: string;
  tags: string;
  spotify_url: string;
  youtube_url: string;
  apple_music_url: string;
  soundcloud_url: string;
  drive_file_url: string;
}

type Step = "form" | "confirm";

export default function PublishDraftModal({
  draft,
  artistName,
  onClose,
  onPublished,
}: PublishDraftModalProps) {
  const [form, setForm] = useState<PublishForm>({
    title: draft.title,
    artist_name: artistName ?? "BERTIAKA",
    year: new Date().getFullYear(),
    featuring: "",
    genre: "",
    tags: "",
    spotify_url: "",
    youtube_url: "",
    apple_music_url: "",
    soundcloud_url: "",
    drive_file_url: draft.drive_file_url ?? "",
  });
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Auto-focus title; Escape goes back to form on confirm step, or closes
  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 50);
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (step === "confirm") { setStep("form"); return; }
      onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, step]);

  function set<K extends keyof PublishForm>(key: K, value: PublishForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
  }

  function handleNext(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("El título es requerido");
      return;
    }
    if (!form.artist_name.trim()) {
      setError("El artista es requerido");
      return;
    }
    setStep("confirm");
  }

  async function handlePublish() {
    setLoading(true);
    setError(null);

    const { publishDraft } = await import("@/lib/actions/drafts");
    const result = await publishDraft(draft.id, {
      title: form.title.trim(),
      artist_name: form.artist_name.trim(),
      year: form.year,
      featuring: form.featuring
        ? form.featuring.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      genre: form.genre.trim() || null,
      tags: form.tags
        ? form.tags.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      spotify_url: form.spotify_url.trim() || null,
      youtube_url: form.youtube_url.trim() || null,
      apple_music_url: form.apple_music_url.trim() || null,
      soundcloud_url: form.soundcloud_url.trim() || null,
      drive_file_url: form.drive_file_url.trim() || null,
    });

    if (result.error || !result.data) {
      setError(result.error ?? "Error desconocido");
      setStep("form");
    } else {
      onPublished(result.data);
    }
    setLoading(false);
  }

  const featList = form.featuring ? form.featuring.split(",").map(s => s.trim()).filter(Boolean) : [];
  const tagList = form.tags ? form.tags.split(",").map(s => s.trim()).filter(Boolean) : [];
  const platformCount = [form.spotify_url, form.youtube_url, form.apple_music_url, form.soundcloud_url].filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* Glow ring */}
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-green-500/20 via-transparent to-emerald-500/10 pointer-events-none" />
        <div className="relative glass-panel rounded-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border/60 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-green-500/15 border border-green-500/20 flex items-center justify-center flex-shrink-0">
              <Upload className="h-4 w-4 text-green-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold">
                {step === "form" ? "Publicar maqueta" : "Confirmar publicación"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                &ldquo;{draft.title}&rdquo; → Discografía
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-muted/50 transition-all active:scale-95 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Draft context strip */}
        {(draft.producer || draft.notes) && (
          <div className="px-5 py-2.5 bg-secondary/30 border-b border-border/60 flex items-start gap-3">
            <Music2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              {draft.producer && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Productor:</span> {draft.producer}
                </p>
              )}
              {draft.notes && (
                <div className="flex items-start gap-1.5 mt-1">
                  <StickyNote className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground line-clamp-2">{draft.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP: FORM ── */}
        {step === "form" && (
          <form onSubmit={handleNext} className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-4">
              {error && (
                <p className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-2xl">{error}</p>
              )}

              <SectionLabel icon={Music2} label="Información básica" />

              <Field label="Título *">
                <input
                  ref={titleRef}
                  type="text"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  className={inputClass}
                  placeholder="Nombre de la canción"
                />
              </Field>

              <Field label="Artista *">
                <input
                  type="text"
                  value={form.artist_name}
                  onChange={(e) => set("artist_name", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Año *">
                  <input
                    type="number"
                    value={form.year}
                    onChange={(e) => set("year", Number(e.target.value))}
                    min={1900}
                    max={2100}
                    className={inputClass}
                  />
                </Field>
                <Field label="Género">
                  <input
                    type="text"
                    list="publish-genre-options"
                    value={form.genre}
                    onChange={(e) => set("genre", e.target.value)}
                    placeholder="Trap, R&B…"
                    className={inputClass}
                  />
                  <datalist id="publish-genre-options">
                    {["Trap", "Reggaeton", "Hip Hop", "R&B", "Pop", "Drill", "Dancehall", "Afrobeats", "Otro"].map((g) => (
                      <option key={g} value={g} />
                    ))}
                  </datalist>
                </Field>
              </div>

              <Field label="Featuring (separados por coma)">
                <input
                  type="text"
                  value={form.featuring}
                  onChange={(e) => set("featuring", e.target.value)}
                  placeholder="Artista 1, Artista 2"
                  className={inputClass}
                />
              </Field>

              <Field label="Tags (separados por coma)">
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => set("tags", e.target.value)}
                  placeholder="single, remix, boom-bap…"
                  className={inputClass}
                />
              </Field>

              <SectionLabel icon={ExternalLink} label="Links de plataformas (opcional)" />

              <div className="space-y-2">
                {([
                  { key: "spotify_url",      placeholder: "https://open.spotify.com/track/…",  label: "Spotify" },
                  { key: "youtube_url",      placeholder: "https://youtube.com/watch?v=…",      label: "YouTube" },
                  { key: "apple_music_url",  placeholder: "https://music.apple.com/…",          label: "Apple Music" },
                  { key: "soundcloud_url",   placeholder: "https://soundcloud.com/…",           label: "SoundCloud" },
                  { key: "drive_file_url",   placeholder: "https://drive.google.com/file/…",   label: "Drive (audio)" },
                ] as { key: keyof PublishForm; placeholder: string; label: string }[]).map(({ key, placeholder, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-24 flex-shrink-0">{label}</span>
                    <input
                      type="url"
                      value={form[key] as string}
                      onChange={(e) => set(key, e.target.value)}
                      placeholder={placeholder}
                      className={cn(inputClass, "text-xs flex-1")}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 px-5 pb-5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-border/60 text-sm font-medium hover:bg-secondary/60 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Revisar y publicar →
              </button>
            </div>
          </form>
        )}

        {/* ── STEP: CONFIRM ── */}
        {step === "confirm" && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-4">
              {error && (
                <p className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-2xl">{error}</p>
              )}

              {/* Summary card */}
              <div className="bg-secondary/30 rounded-2xl border border-border/60 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Music2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-base leading-tight">{form.title}</p>
                    <p className="text-sm text-muted-foreground">{form.artist_name} · {form.year}</p>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm">
                  {form.genre && (
                    <p className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground w-20">Género</span>
                      <span className="px-2 py-0.5 bg-secondary rounded-full">{form.genre}</span>
                    </p>
                  )}
                  {featList.length > 0 && (
                    <p className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground w-20">Featuring</span>
                      <span className="flex gap-1 flex-wrap">
                        {featList.map(f => (
                          <span key={f} className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded-full">{f}</span>
                        ))}
                      </span>
                    </p>
                  )}
                  {tagList.length > 0 && (
                    <p className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground w-20">Tags</span>
                      <span className="flex gap-1 flex-wrap">
                        {tagList.map(t => (
                          <span key={t} className="px-2 py-0.5 bg-secondary text-muted-foreground rounded-full">#{t}</span>
                        ))}
                      </span>
                    </p>
                  )}
                  {platformCount > 0 && (
                    <p className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground w-20">Plataformas</span>
                      <span className="text-foreground">{platformCount} link{platformCount !== 1 ? "s" : ""} agregado{platformCount !== 1 ? "s" : ""}</span>
                    </p>
                  )}
                  {form.drive_file_url && (
                    <p className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground w-20">Audio</span>
                      <span className="text-blue-400">Drive vinculado</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-2 px-1 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0 mt-0.5" />
                <p>
                  La maqueta quedará marcada como <span className="font-medium text-foreground">publicada</span> y
                  la canción aparecerá en Discografía.
                </p>
              </div>
            </div>

            <div className="flex gap-3 px-5 pb-5">
              <button
                type="button"
                onClick={() => setStep("form")}
                className="flex-1 py-2.5 rounded-xl border border-border/60 text-sm font-medium hover:bg-secondary/60 transition-all active:scale-95"
              >
                ← Atrás
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Publicar ahora
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <div className="flex-1 h-px bg-border/60" />
    </div>
  );
}

const inputClass =
  "w-full px-3 py-2.5 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors";
