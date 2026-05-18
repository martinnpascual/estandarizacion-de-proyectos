"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Loader2, Music, X, FolderOpen, ExternalLink } from "lucide-react";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
}

interface Props {
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

export default function DriveFilePicker({ onSelect, onClose }: Props) {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(); }
    }
    // useCapture=true so this fires before any page-level handler
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = debouncedSearch ? `?q=${encodeURIComponent(debouncedSearch)}` : "";
      const res = await fetch(`/api/drive/files${qs}`);
      const json = await res.json();

      if (json.needs_auth) {
        setNeedsAuth(true);
        setLoading(false);
        return;
      }
      if (json.error) {
        setError(json.error);
      } else {
        setFiles(json.files ?? []);
      }
    } catch {
      setError("Error al conectar con Drive");
    }
    setLoading(false);
  }, [debouncedSearch]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        {/* Glow ring */}
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-green-500/20 via-transparent to-emerald-500/10 pointer-events-none" />
        <div className="relative glass-panel rounded-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-green-500/15 border border-green-500/20 flex items-center justify-center flex-shrink-0">
              <FolderOpen className="h-4 w-4 text-green-400" />
            </div>
            <h2 className="text-base font-semibold">Google Drive — Archivos de audio</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-muted/50 transition-all active:scale-95 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {needsAuth ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-4">
            <FolderOpen className="h-10 w-10 text-muted-foreground/30" />
            <div>
              <p className="text-sm font-medium">Drive no conectado</p>
              <p className="text-xs text-muted-foreground mt-1">
                Necesitás conectar tu cuenta de Google para acceder a los archivos.
              </p>
            </div>
            <a
              href="/api/auth/google"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/80 transition-all active:scale-95"
            >
              Conectar con Google
            </a>
          </div>
        ) : (
          <>
            <div className="p-3 border-b border-border/60">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar archivos..."
                  className="w-full pl-9 pr-3 py-2 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <p className="text-sm text-red-500">{error}</p>
                  <button onClick={fetchFiles} className="mt-2 text-xs text-primary hover:underline">
                    Reintentar
                  </button>
                </div>
              ) : files.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Music className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {search ? "No se encontraron archivos" : "Sin archivos de audio en Drive"}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 cursor-pointer transition-all active:scale-[0.99] group"
                      onClick={() => onSelect(file)}
                    >
                      <Music className="h-4 w-4 text-muted-foreground flex-shrink-0 group-hover:scale-110 transition-transform" />
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
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-xl hover:bg-secondary text-muted-foreground transition-all active:scale-95"
                          title="Ver en Drive"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
