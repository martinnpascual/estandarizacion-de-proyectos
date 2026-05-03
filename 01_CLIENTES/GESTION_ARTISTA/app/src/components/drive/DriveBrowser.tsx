"use client";

/**
 * DriveBrowser — Explorador de Google Drive con navegación de carpetas.
 * Soporta archivos de audio e imágenes.
 *
 * Props:
 *   fileType   — "audio" | "image"
 *   onSelect   — callback con el archivo seleccionado
 *   onClose    — cierra el modal
 */

import { useState, useEffect, useCallback } from "react";
import {
  Search, Loader2, Music, X, Folder, ChevronRight,
  Image as ImageIcon, ExternalLink, ArrowLeft, Home,
  AlertCircle, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  isFolder: boolean;
}

interface BreadcrumbEntry {
  id: string | null; // null = root
  name: string;
}

interface Props {
  fileType: "audio" | "image";
  onSelect: (file: DriveFile) => void;
  onClose: () => void;
}

function formatSize(bytes?: string): string {
  if (!bytes) return "";
  const n = parseInt(bytes);
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${n} B`;
}

export default function DriveBrowser({ fileType, onSelect, onClose }: Props) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbEntry[]>([
    { id: null, name: "Mi Drive" },
  ]);
  const [viewMode, setViewMode] = useState<"list" | "grid">(
    fileType === "image" ? "grid" : "list"
  );

  const currentFolder = breadcrumbs[breadcrumbs.length - 1];

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); }
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ type: fileType });
      if (debouncedSearch) {
        qs.set("q", debouncedSearch);
      } else if (currentFolder.id) {
        qs.set("folderId", currentFolder.id);
      }

      const res = await fetch(`/api/drive/files?${qs}`);
      const json = await res.json();

      if (json.needs_auth) { setNeedsAuth(true); setLoading(false); return; }
      if (json.error)       { setError(json.error); }
      else                  { setFiles(json.files ?? []); }
    } catch {
      setError("Error al conectar con Drive");
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, currentFolder.id, fileType]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  function enterFolder(folder: DriveFile) {
    setSearch("");
    setDebouncedSearch("");
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
  }

  function navigateTo(index: number) {
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    setSearch("");
    setDebouncedSearch("");
  }

  const label = fileType === "image" ? "Imágenes" : "Archivos de audio";
  const Icon  = fileType === "image" ? ImageIcon : Music;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Folder className="h-4 w-4 text-[#4285f4]" />
            Google Drive — {label}
          </h2>
          <div className="flex items-center gap-1">
            {fileType === "image" && (
              <>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn("p-1.5 rounded text-xs", viewMode === "list" ? "bg-secondary" : "hover:bg-secondary/50 text-muted-foreground")}
                  title="Vista lista"
                >
                  ☰
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn("p-1.5 rounded text-xs", viewMode === "grid" ? "bg-secondary" : "hover:bg-secondary/50 text-muted-foreground")}
                  title="Vista cuadrícula"
                >
                  ⊞
                </button>
              </>
            )}
            <button onClick={fetchFiles} className="p-1.5 rounded hover:bg-secondary text-muted-foreground" title="Recargar">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-secondary">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {needsAuth ? (
          /* ── Auth prompt ───────────────────────────────────────────────────── */
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
            <AlertCircle className="h-10 w-10 text-amber-500/60" />
            <div>
              <p className="text-sm font-medium">Drive no conectado</p>
              <p className="text-xs text-muted-foreground mt-1">
                Necesitás conectar tu cuenta de Google para acceder a los archivos.
              </p>
            </div>
            <a
              href="/api/auth/google"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/80 transition-colors"
            >
              Conectar con Google
            </a>
          </div>
        ) : (
          <>
            {/* ── Search ───────────────────────────────────────────────────────── */}
            <div className="px-3 py-2.5 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Buscar ${label.toLowerCase()} en todo el Drive...`}
                  className="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                {search && (
                  <button
                    onClick={() => { setSearch(""); setDebouncedSearch(""); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* ── Breadcrumb ───────────────────────────────────────────────────── */}
            {!search && (
              <div className="flex items-center gap-1 px-3 py-1.5 text-xs text-muted-foreground border-b border-border bg-secondary/20 flex-wrap">
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i === 0 && <Home className="h-3 w-3" />}
                    {i < breadcrumbs.length - 1 ? (
                      <>
                        <button
                          onClick={() => navigateTo(i)}
                          className="hover:text-foreground hover:underline transition-colors"
                        >
                          {crumb.name}
                        </button>
                        <ChevronRight className="h-3 w-3" />
                      </>
                    ) : (
                      <span className="text-foreground font-medium">{crumb.name}</span>
                    )}
                  </span>
                ))}
                {breadcrumbs.length > 1 && (
                  <button
                    onClick={() => navigateTo(breadcrumbs.length - 2)}
                    className="ml-auto flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-3 w-3" /> Atrás
                  </button>
                )}
              </div>
            )}

            {/* ── File list ────────────────────────────────────────────────────── */}
            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4 gap-3">
                  <AlertCircle className="h-8 w-8 text-red-500/40" />
                  <p className="text-sm text-red-500">{error}</p>
                  <button onClick={fetchFiles} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" /> Reintentar
                  </button>
                </div>
              ) : files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                  <Icon className="h-10 w-10 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground">
                    {search
                      ? `No se encontraron ${label.toLowerCase()} con ese nombre`
                      : `Esta carpeta no tiene ${label.toLowerCase()}`}
                  </p>
                </div>
              ) : viewMode === "grid" && fileType === "image" ? (
                /* ── Grid view (images only) ─────────────────────────────────── */
                <div className="p-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {files.map((file) =>
                    file.isFolder ? (
                      <button
                        key={file.id}
                        onClick={() => enterFolder(file)}
                        className="flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer text-center"
                      >
                        <Folder className="h-10 w-10 text-[#4285f4]" />
                        <span className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
                          {file.name}
                        </span>
                      </button>
                    ) : (
                      <button
                        key={file.id}
                        onClick={() => onSelect(file)}
                        className="group relative rounded-lg overflow-hidden border-2 border-transparent hover:border-primary/60 transition-all cursor-pointer aspect-square bg-secondary/30"
                        title={file.name}
                      >
                        {file.thumbnailLink ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={file.thumbnailLink}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                          </div>
                        )}
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1">
                          <span className="text-white text-[10px] text-center line-clamp-3 leading-tight">
                            {file.name}
                          </span>
                        </div>
                      </button>
                    )
                  )}
                </div>
              ) : (
                /* ── List view ───────────────────────────────────────────────── */
                <div className="divide-y divide-border">
                  {files.map((file) =>
                    file.isFolder ? (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 cursor-pointer transition-colors group"
                        onClick={() => enterFolder(file)}
                      >
                        <Folder className="h-4 w-4 text-[#4285f4] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">Carpeta</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ) : (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 cursor-pointer transition-colors group"
                        onClick={() => onSelect(file)}
                      >
                        {/* Thumbnail or icon */}
                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-secondary flex-shrink-0 flex items-center justify-center">
                          {fileType === "image" && file.thumbnailLink ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={file.thumbnailLink}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatSize(file.size)}
                            {file.modifiedTime && (
                              <span className="ml-2">
                                {new Date(file.modifiedTime).toLocaleDateString("es-AR")}
                              </span>
                            )}
                          </p>
                        </div>
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-secondary text-muted-foreground transition-all"
                            title="Ver en Drive"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* ── Footer ───────────────────────────────────────────────────────── */}
            <div className="px-4 py-2.5 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
              <span>
                {files.filter((f) => !f.isFolder).length} archivo
                {files.filter((f) => !f.isFolder).length !== 1 ? "s" : ""}{" "}
                {files.filter((f) => f.isFolder).length > 0 &&
                  `· ${files.filter((f) => f.isFolder).length} carpeta${files.filter((f) => f.isFolder).length !== 1 ? "s" : ""}`}
              </span>
              <span>Hacé clic para seleccionar</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
