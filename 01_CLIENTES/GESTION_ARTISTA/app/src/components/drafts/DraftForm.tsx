"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2, FolderOpen, Music, Sparkles, Zap, AlertCircle, CheckCircle2 } from "lucide-react";
import { DraftSchema, type DraftFormData } from "@/lib/schemas";
import type { Draft } from "@/types/database";
import DriveFilePicker from "@/components/drive/DriveFilePicker";
import CoverArtUploader from "@/components/cover/CoverArtUploader";
import { useAudioAnalysis } from "@/hooks/useAudioAnalysis";

type FormErrors = Partial<Record<keyof DraftFormData | "root", string>>;

interface DraftFormProps {
  draft?: Draft;
  onClose: () => void;
  onSaved: (draft: Draft) => void;
}

const STATUS_OPTIONS = [
  { value: "borrador", label: "Borrador" },
  { value: "en_mezcla", label: "En mezcla" },
  { value: "masterizada", label: "Masterizada" },
  { value: "lista_para_publicar", label: "Lista para publicar" },
] as const;

const KEY_SIGNATURES = [
  "C mayor", "G mayor", "D mayor", "A mayor", "E mayor", "B mayor",
  "F# mayor", "C# mayor", "F mayor", "Bb mayor", "Eb mayor", "Ab mayor",
  "A menor", "E menor", "B menor", "F# menor", "C# menor", "G# menor",
  "D menor", "G menor", "C menor", "F menor", "Bb menor", "Eb menor",
];

function draftToForm(draft: Draft): DraftFormData {
  return {
    title: draft.title,
    producer: draft.producer,
    status: draft.status,
    drive_file_id: draft.drive_file_id,
    drive_file_url: draft.drive_file_url,
    cover_art_url: draft.cover_art_url ?? null,
    notes: draft.notes,
    bpm: draft.bpm ?? null,
    key_signature: draft.key_signature ?? null,
    month_created: draft.month_created,
  };
}

const EMPTY_FORM: DraftFormData = {
  title: "",
  producer: null,
  status: "borrador",
  drive_file_id: null,
  drive_file_url: null,
  cover_art_url: null,
  notes: null,
  bpm: null,
  key_signature: null,
  month_created: new Date().toISOString().slice(0, 7),
};

export default function DraftForm({ draft, onClose, onSaved }: DraftFormProps) {
  const [form, setForm] = useState<DraftFormData>(
    draft ? draftToForm(draft) : EMPTY_FORM
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
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

  function set<K extends keyof DraftFormData>(key: K, value: DraftFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleDetect() {
    if (!form.drive_file_id) return;
    setJustDetected(false);
    resetAnalysis();

    const streamUrl = `/api/drive/stream/${form.drive_file_id}`;
    const result = await analyze(streamUrl);
    if (result) {
      set("bpm", result.bpm);
      set("key_signature", result.key);
      setJustDetected(true);
      setTimeout(() => setJustDetected(false), 4000);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const parsed = DraftSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: FormErrors = {};
      parsed.error.errors.forEach((err) => {
        const key = err.path[0] as keyof DraftFormData;
        if (!fieldErrors[key]) fieldErrors[key] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);
    try {
      let result: { data: Draft | null; error: string | null };
      if (draft) {
        const { updateDraft } = await import("@/lib/actions/drafts");
        result = await updateDraft(draft.id, parsed.data);
      } else {
        const { createDraft } = await import("@/lib/actions/drafts");
        result = await createDraft(parsed.data);
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
      <div className="bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-[0_32px_80px_hsl(0_0%_0%/0.5)]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60 sticky top-0 bg-card/95 backdrop-blur-xl z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/30 to-purple-500/10 flex items-center justify-center border border-blue-500/20">
              <Music className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <h2 className="text-sm font-semibold">
              {draft ? "Editar maqueta" : "Nueva maqueta"}
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

          <Field label="Título *" error={errors.title}>
            <input
              ref={titleRef}
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Nombre de la maqueta"
              className={inputClass(!!errors.title)}
            />
          </Field>

          <Field label="Productor" error={errors.producer}>
            <input
              type="text"
              value={form.producer ?? ""}
              onChange={(e) => set("producer", e.target.value.trim() || null)}
              placeholder="Nombre del productor"
              className={inputClass(false)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Estado *" error={errors.status}>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value as DraftFormData["status"])}
                className={inputClass(!!errors.status)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Mes de creación *" error={errors.month_created}>
              <input
                type="month"
                value={form.month_created}
                onChange={(e) => set("month_created", e.target.value)}
                className={inputClass(!!errors.month_created)}
              />
            </Field>
          </div>

          {/* ── BPM + Tonalidad con detección automática ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">BPM y Tonalidad</span>

              {form.drive_file_id && (
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
              )}
            </div>

            {analysisError && (
              <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1.5 rounded-lg">
                {analysisError}
              </p>
            )}

            {!form.drive_file_id && (
              <p className="text-[11px] text-muted-foreground/60 flex items-center gap-1.5">
                <Zap className="h-3 w-3" />
                Vinculá un audio de Google Drive para detectar BPM y tonalidad automáticamente.
              </p>
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

          {/* ── Archivo de audio ── */}
          <Field label="Archivo de audio (Google Drive)" error={undefined}>
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
                  onClick={() => { set("drive_file_id", null); set("drive_file_url", null); resetAnalysis(); }}
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

          <CoverArtUploader
            value={form.cover_art_url ?? null}
            onChange={(url) => set("cover_art_url", url)}
            label="Portada (opcional)"
            size="md"
          />

          <Field label="Notas" error={errors.notes}>
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value.trim() || null)}
              placeholder="Referencias, ideas, pendientes..."
              rows={3}
              className={inputClass(false) + " resize-none"}
            />
          </Field>

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
              {draft ? "Guardar cambios" : "Crear maqueta"}
            </button>
          </div>
        </form>
      </div>

      {showDrivePicker && (
        <DriveFilePicker
          onSelect={(file) => {
            set("drive_file_id", file.id);
            set("drive_file_url", file.webViewLink ?? file.webContentLink ?? null);
            setShowDrivePicker(false);
            resetAnalysis();
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
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `w-full px-3 py-2.5 bg-background/50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all placeholder:text-muted-foreground/40 ${
    hasError ? "border-red-500/60" : "border-border/60"
  }`;
}
