"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2, FolderOpen, Music } from "lucide-react";
import { DraftSchema, type DraftFormData } from "@/lib/schemas";
import type { Draft } from "@/types/database";
import DriveFilePicker from "@/components/drive/DriveFilePicker";
import CoverArtUploader from "@/components/cover/CoverArtUploader";

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
  const titleRef = useRef<HTMLInputElement>(null);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-base font-semibold">
            {draft ? "Editar maqueta" : "Nueva maqueta"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {errors.root && (
            <p className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-lg">
              {errors.root}
            </p>
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
              onChange={(e) =>
                set("producer", e.target.value.trim() || null)
              }
              placeholder="Nombre del productor"
              className={inputClass(false)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Estado *" error={errors.status}>
              <select
                value={form.status}
                onChange={(e) =>
                  set("status", e.target.value as DraftFormData["status"])
                }
                className={inputClass(!!errors.status)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
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

          {/* BPM + Tonalidad */}
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
                className={inputClass(!!errors.bpm)}
              />
            </Field>
            <Field label="Tonalidad" error={errors.key_signature}>
              <select
                value={form.key_signature ?? ""}
                onChange={(e) =>
                  set("key_signature", e.target.value === "" ? null : e.target.value)
                }
                className={inputClass(false)}
              >
                <option value="">Sin especificar</option>
                {KEY_SIGNATURES.map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Archivo de audio (Google Drive)" error={undefined}>
            {form.drive_file_url ? (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-background border border-border rounded-lg">
                <Music className="h-4 w-4 text-green-400 flex-shrink-0" />
                <span className="text-sm truncate flex-1 text-muted-foreground">
                  {form.drive_file_url.length > 48
                    ? "…" + form.drive_file_url.slice(-45)
                    : form.drive_file_url}
                </span>
                <button
                  type="button"
                  onClick={() => { set("drive_file_id", null); set("drive_file_url", null); }}
                  className="text-muted-foreground hover:text-foreground flex-shrink-0"
                  title="Quitar archivo"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDrivePicker(true)}
                className="flex items-center gap-2 w-full px-3 py-2.5 bg-background border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground transition-colors"
              >
                <FolderOpen className="h-4 w-4" />
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
              onChange={(e) =>
                set("notes", e.target.value.trim() || null)
              }
              placeholder="Referencias, ideas, pendientes..."
              rows={3}
              className={inputClass(false) + " resize-none"}
            />
          </Field>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-secondary transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
  return `w-full px-3 py-2.5 bg-background border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${
    hasError ? "border-red-500" : "border-border"
  }`;
}
