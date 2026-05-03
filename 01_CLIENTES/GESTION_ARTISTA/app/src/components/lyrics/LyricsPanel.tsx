"use client";

/**
 * LyricsPanel — Panel lateral deslizante para ver y editar letras de canciones/maquetas.
 * Soporta modo lectura (con formato de estrofas) y modo edición.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Pencil, Save, FileText, RotateCcw, Copy, Check,
  AlignLeft, Eye, Loader2, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { updateSongLyrics } from "@/lib/actions/songs";
import { updateDraftLyrics } from "@/lib/actions/drafts";

interface Props {
  type: "song" | "draft";
  id: string;
  title: string;
  artist?: string;
  initialLyrics: string | null;
  onClose: () => void;
  /** Callback fired after successful save, with the new lyrics value */
  onSaved?: (lyrics: string | null) => void;
}

// Split lyrics text into verse blocks (separated by blank lines)
function parseVerses(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((v) => v.trim())
    .filter(Boolean);
}

// Detect if a verse starts with a label like [Estribillo], (Verso 1), etc.
function verseLabel(verse: string): string | null {
  const match = verse.match(/^[\[(]([^\])\n]+)[\])](?:\s*\n|$)/);
  return match ? match[1] : null;
}

function verseBody(verse: string): string {
  return verse.replace(/^[\[(][^\])\n]+[\])]\s*\n?/, "").trim();
}

function wordCount(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

function lineCount(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\n/).length;
}

export default function LyricsPanel({
  type,
  id,
  title,
  artist,
  initialLyrics,
  onClose,
  onSaved,
}: Props) {
  const [lyrics, setLyrics] = useState(initialLyrics ?? "");
  const [draft, setDraft] = useState(initialLyrics ?? "");
  const [mode, setMode] = useState<"view" | "edit">(initialLyrics ? "view" : "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDirty = draft !== lyrics;

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (mode === "edit") {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [mode]);

  // Keyboard: Escape closes (unless editing dirty), Ctrl+S saves
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (mode === "edit" && isDirty) {
          // confirm discard
          if (confirm("¿Descartar cambios?")) {
            setDraft(lyrics);
            setMode(lyrics ? "view" : "edit");
          }
          return;
        }
        onClose();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (mode === "edit") handleSave();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, isDirty, lyrics, onClose]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    const value = draft.trim() || null;

    const result = type === "song"
      ? await updateSongLyrics(id, value)
      : await updateDraftLyrics(id, value);

    if (result.error) {
      setError(result.error);
      setSaving(false);
      return;
    }

    setLyrics(draft.trim());
    setSaving(false);
    setMode(draft.trim() ? "view" : "edit");
    onSaved?.(value);
  }, [draft, id, type, onSaved]);

  function handleDiscard() {
    setDraft(lyrics);
    setMode(lyrics ? "view" : "edit");
  }

  function handleCopy() {
    if (!lyrics) return;
    navigator.clipboard.writeText(lyrics).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleClear() {
    if (!confirm("¿Eliminar la letra de esta canción?")) return;
    setSaving(true);
    const result = type === "song"
      ? await updateSongLyrics(id, null)
      : await updateDraftLyrics(id, null);
    setSaving(false);
    if (result.error) { setError(result.error); return; }
    setLyrics("");
    setDraft("");
    setMode("edit");
    onSaved?.(null);
  }

  const verses = parseVerses(lyrics);
  const words = wordCount(lyrics);
  const lines = lineCount(lyrics);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={() => {
          if (mode === "edit" && isDirty) {
            if (!confirm("¿Descartar cambios?")) return;
          }
          onClose();
        }}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{title}</p>
              {artist && (
                <p className="text-[11px] text-muted-foreground truncate">{artist}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* View / Edit toggle */}
            {lyrics && (
              <div className="flex items-center border border-border rounded-lg overflow-hidden mr-1">
                <button
                  onClick={() => setMode("view")}
                  title="Vista previa"
                  className={cn(
                    "px-2 py-1.5 text-xs transition-colors flex items-center gap-1",
                    mode === "view"
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Ver</span>
                </button>
                <button
                  onClick={() => { setDraft(lyrics); setMode("edit"); }}
                  title="Editar letra"
                  className={cn(
                    "px-2 py-1.5 text-xs transition-colors border-l border-border flex items-center gap-1",
                    mode === "edit"
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Editar</span>
                </button>
              </div>
            )}
            {/* Copy */}
            {lyrics && mode === "view" && (
              <button
                onClick={handleCopy}
                title="Copiar letra"
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  copied ? "bg-green-500/15 text-green-400" : "hover:bg-secondary text-muted-foreground"
                )}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            )}
            {/* Clear */}
            {lyrics && (
              <button
                onClick={handleClear}
                title="Eliminar letra"
                disabled={saving}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Stats bar (visible in view mode with content) */}
        {mode === "view" && lyrics && (
          <div className="flex items-center gap-3 px-5 py-2 bg-secondary/30 border-b border-border text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <AlignLeft className="h-3 w-3" />
              {verses.length} {verses.length === 1 ? "estrofa" : "estrofas"}
            </span>
            <span>·</span>
            <span>{lines} {lines === 1 ? "línea" : "líneas"}</span>
            <span>·</span>
            <span>{words} {words === 1 ? "palabra" : "palabras"}</span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {mode === "view" ? (
            /* ── VIEW MODE ── */
            lyrics ? (
              <div className="p-5 space-y-5">
                {verses.map((verse, i) => {
                  const label = verseLabel(verse);
                  const body = label ? verseBody(verse) : verse;
                  return (
                    <div key={i} className="space-y-1.5">
                      {label && (
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/70">
                          {label}
                        </p>
                      )}
                      <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap font-['Georgia',serif]">
                        {body}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
                <FileText className="h-12 w-12 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">Sin letra todavía</p>
                <button
                  onClick={() => setMode("edit")}
                  className="text-sm text-primary hover:underline"
                >
                  Agregar letra
                </button>
              </div>
            )
          ) : (
            /* ── EDIT MODE ── */
            <div className="flex flex-col h-full p-4 gap-3">
              {/* Hint */}
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Escribí la letra libremente. Separar estrofas con una línea en blanco.
                Podés usar <code className="bg-secondary px-1 rounded">[Verso 1]</code>,{" "}
                <code className="bg-secondary px-1 rounded">[Estribillo]</code>, etc. para etiquetar secciones.
              </p>
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={"[Verso 1]\nEscribí aquí la primera estrofa...\n\n[Estribillo]\nY aquí el estribillo..."}
                className="flex-1 resize-none bg-secondary/30 border border-border rounded-xl p-4 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/50 font-['Georgia',serif] placeholder:text-muted-foreground/40 placeholder:font-sans min-h-[300px]"
                spellCheck
              />
              {/* Stats */}
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span>{wordCount(draft)} palabras</span>
                <span>·</span>
                <span>{lineCount(draft)} líneas</span>
                <span>·</span>
                <span>{draft.length} caracteres</span>
              </div>
              {/* Error */}
              {error && (
                <p className="text-xs text-red-500 bg-red-500/10 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}
              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/80 transition-colors disabled:opacity-50"
                >
                  {saving
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando…</>
                    : <><Save className="h-3.5 w-3.5" /> Guardar</>}
                </button>
                {isDirty && (
                  <button
                    onClick={handleDiscard}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Descartar
                  </button>
                )}
                {lyrics && !isDirty && (
                  <button
                    onClick={() => setMode("view")}
                    className="px-3 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    Cancelar
                  </button>
                )}
                <span className="ml-auto text-[10px] text-muted-foreground/60">
                  Ctrl+S para guardar
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
