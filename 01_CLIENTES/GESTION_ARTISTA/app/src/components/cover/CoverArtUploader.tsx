"use client";

/**
 * CoverArtUploader — Sube o selecciona imágenes de portada.
 * Opciones:
 *   1. Subir desde disco  → /api/drive/upload → /api/drive/stream/{id}
 *   2. Elegir desde Drive → DriveBrowser (imagen) → /api/drive/stream/{id}
 *   3. Pegar URL manual   → cualquier URL http/https
 */
import { useRef, useState } from "react";
import { Upload, X, Link, Loader2, ImageIcon, AlertCircle, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import DriveBrowser, { type DriveFile } from "@/components/drive/DriveBrowser";

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  /** Tamaño del preview: "sm" = 80px, "md" = 128px (default), "lg" = 160px */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = {
  sm:  { container: "w-20 h-20",  img: 80  },
  md:  { container: "w-32 h-32",  img: 128 },
  lg:  { container: "w-40 h-40",  img: 160 },
};

type Mode = "preview" | "url";

export default function CoverArtUploader({
  value,
  onChange,
  label = "Portada",
  size = "md",
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading]       = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [mode, setMode]                 = useState<Mode>("preview");
  const [urlInput, setUrlInput]         = useState(value ?? "");
  const [needsAuth, setNeedsAuth]       = useState(false);
  const [showDrivePicker, setShowDrivePicker] = useState(false);

  const { container, img } = SIZE_MAP[size];

  // ── Upload from disk ────────────────────────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Solo se permiten imágenes (PNG, JPG, WEBP…)");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("La imagen no puede superar 10 MB");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res  = await fetch("/api/drive/upload", { method: "POST", body: fd });
      const json = await res.json();

      if (json.needs_auth) { setNeedsAuth(true); setMode("url"); setUploading(false); return; }
      if (json.error)      { setError(json.error); setUploading(false); return; }

      onChange(json.url);
      setUrlInput(json.url);
    } catch {
      setError("Error de conexión al subir la imagen");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  // ── Select from Drive ───────────────────────────────────────────────────────
  function handleDriveSelect(file: DriveFile) {
    const url = `/api/drive/stream/${file.id}`;
    onChange(url);
    setUrlInput(url);
    setShowDrivePicker(false);
    setMode("preview");
  }

  // ── Confirm manual URL ──────────────────────────────────────────────────────
  const confirmUrl = () => {
    const trimmed = urlInput.trim();
    onChange(trimmed || null);
    setMode("preview");
  };

  return (
    <>
      <div className={cn("space-y-2", className)}>
        {label && <p className="text-sm font-medium">{label}</p>}

        <div className="flex items-start gap-4">
          {/* Image preview / placeholder */}
          <div
            className={cn(
              "relative rounded-xl border-2 border-dashed border-border bg-muted/40 overflow-hidden",
              "flex items-center justify-center shrink-0 group cursor-pointer transition-colors hover:border-primary/50",
              container,
              uploading && "opacity-60"
            )}
            onClick={() => !uploading && inputRef.current?.click()}
            title="Clic para subir desde disco"
          >
            {value ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={value}
                  alt="Portada"
                  width={img}
                  height={img}
                  className="object-cover w-full h-full"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {uploading ? (
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                  ) : (
                    <Upload className="h-6 w-6 text-white" />
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1 text-muted-foreground">
                {uploading ? (
                  <Loader2 className="h-7 w-7 animate-spin" />
                ) : (
                  <>
                    <ImageIcon className="h-7 w-7 opacity-40" />
                    <span className="text-[10px] text-center px-1 opacity-60">Subir</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 pt-1">
            {/* Upload from disk */}
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm hover:bg-secondary transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Subiendo…</>
              ) : (
                <><Upload className="h-3.5 w-3.5" /> {value ? "Cambiar" : "Subir imagen"}</>
              )}
            </button>

            {/* Pick from Drive */}
            <button
              type="button"
              disabled={uploading}
              onClick={() => setShowDrivePicker(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm text-[#4285f4] border-[#4285f4]/30 hover:bg-[#4285f4]/5 transition-colors disabled:opacity-50"
            >
              <FolderOpen className="h-3.5 w-3.5" /> Desde Drive
            </button>

            {/* Manual URL toggle */}
            {mode === "preview" && (
              <button
                type="button"
                onClick={() => { setMode("url"); setUrlInput(value ?? ""); }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <Link className="h-3.5 w-3.5" /> Pegar URL
              </button>
            )}

            {/* Clear */}
            {value && (
              <button
                type="button"
                onClick={() => { onChange(null); setUrlInput(""); setMode("preview"); }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 text-red-500 text-sm hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
              >
                <X className="h-3.5 w-3.5" /> Quitar
              </button>
            )}
          </div>
        </div>

        {/* URL input mode */}
        {mode === "url" && (
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), confirmUrl())}
              placeholder="https://... o /api/drive/stream/..."
              className="flex-1 border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
            <button
              type="button"
              onClick={confirmUrl}
              className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              OK
            </button>
            <button
              type="button"
              onClick={() => setMode("preview")}
              className="px-3 py-2 border rounded-lg text-sm hover:bg-secondary transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* Drive auth prompt */}
        {needsAuth && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-700 dark:text-amber-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              Drive no conectado.{" "}
              <a href="/api/auth/google" className="underline font-medium">
                Conectar Drive
              </a>{" "}
              para subir imágenes, o usá &ldquo;Pegar URL&rdquo;.
            </div>
          </div>
        )}

        {/* Upload error */}
        {error && !needsAuth && (
          <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
            <button type="button" onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Drive image picker */}
      {showDrivePicker && (
        <DriveBrowser
          fileType="image"
          onSelect={handleDriveSelect}
          onClose={() => setShowDrivePicker(false)}
        />
      )}
    </>
  );
}
