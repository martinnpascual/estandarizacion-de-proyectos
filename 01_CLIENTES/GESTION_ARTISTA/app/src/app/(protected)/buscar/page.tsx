"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  Disc3,
  FileAudio,
  Users,
  FolderOpen,
  Calendar,
  ChevronRight,
  Loader2,
  Plus,
  ArrowRight,
  Clock,
  X,
} from "lucide-react";
import { globalSearch, type SearchResult } from "@/lib/actions/search";
import { cn } from "@/lib/utils";
import Link from "next/link";

const TYPE_META: Record<
  SearchResult["type"],
  { label: string; icon: React.ElementType; color: string }
> = {
  song:    { label: "Canción",   icon: Disc3,      color: "text-primary" },
  draft:   { label: "Maqueta",   icon: FileAudio,  color: "text-blue-400" },
  collab:  { label: "Featuring", icon: Users,      color: "text-yellow-400" },
  project: { label: "Proyecto",  icon: FolderOpen, color: "text-purple-400" },
  event:   { label: "Evento",    icon: Calendar,   color: "text-green-400" },
};

const TYPE_ORDER: SearchResult["type"][] = [
  "song", "draft", "collab", "project", "event",
];

const RECENT_SEARCHES_KEY = "ga_recent_searches";
const MAX_RECENT = 6;

function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function addRecentSearch(q: string) {
  try {
    const existing = getRecentSearches().filter((s) => s !== q);
    const next = [q, ...existing].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch {
    // ignore localStorage errors (private browsing, etc.)
  }
}

function removeRecentSearch(q: string) {
  try {
    const next = getRecentSearches().filter((s) => s !== q);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

export default function BuscarPage() {
  return (
    <Suspense fallback={<BuscarSkeleton />}>
      <BuscarContent />
    </Suspense>
  );
}

function BuscarSkeleton() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="h-8 bg-secondary rounded w-48 animate-pulse" />
      <div className="h-12 bg-secondary rounded-xl animate-pulse" />
    </div>
  );
}

function BuscarContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<(HTMLAnchorElement | null)[]>([]);

  const initialQ = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [resultTypeFilter, setResultTypeFilter] = useState<SearchResult["type"] | "all">("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  const doSearch = useCallback(async (q: string, saveToRecent = false) => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      setSelectedIndex(-1);
      return;
    }
    setSearching(true);
    setSelectedIndex(-1);
    setResultTypeFilter("all");
    const { data } = await globalSearch(q);
    setResults(data);
    setSearched(true);
    setSearching(false);
    if (saveToRecent && data.length > 0) {
      addRecentSearch(q.trim());
      setRecentSearches(getRecentSearches());
    }
  }, []);

  useEffect(() => {
    if (initialQ) doSearch(initialQ, false);
    inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (val) params.set("q", val);
      router.replace(`/buscar?${params.toString()}`, { scroll: false });
      doSearch(val, true);
    }, 350);
  }

  // Flat list of all results for keyboard navigation
  const flatResults = results;

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!searched || flatResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => {
        const next = Math.min(prev + 1, flatResults.length - 1);
        resultsRef.current[next]?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => {
        if (prev <= 0) {
          inputRef.current?.focus();
          return -1;
        }
        const next = prev - 1;
        resultsRef.current[next]?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      resultsRef.current[selectedIndex]?.click();
    } else if (e.key === "Escape") {
      setSelectedIndex(-1);
      inputRef.current?.blur();
    }
  }

  function handleRecentClick(q: string) {
    setQuery(q);
    router.replace(`/buscar?q=${encodeURIComponent(q)}`, { scroll: false });
    doSearch(q, false);
  }

  function handleRemoveRecent(q: string, e: React.MouseEvent) {
    e.stopPropagation();
    removeRecentSearch(q);
    setRecentSearches(getRecentSearches());
  }

  // Group ALL results by type (for chips counts)
  const grouped = TYPE_ORDER.reduce<Record<string, SearchResult[]>>(
    (acc, type) => {
      const items = results.filter((r) => r.type === type);
      if (items.length) acc[type] = items;
      return acc;
    },
    {}
  );

  // Apply type filter for display
  const displayedGrouped = resultTypeFilter === "all"
    ? grouped
    : { [resultTypeFilter]: grouped[resultTypeFilter] ?? [] };

  const totalCount = results.length;
  const displayedCount = Object.values(displayedGrouped).reduce((s, a) => s + a.length, 0);

  // Build flat result list with global index for keyboard nav highlighting
  let globalIdx = 0;
  const groupsWithIndex = (
    TYPE_ORDER
      .filter((t) => displayedGrouped[t]?.length)
      .map((type) => ({
        type,
        items: (displayedGrouped[type] ?? []).map((r) => ({ ...r, globalIdx: globalIdx++ })),
      }))
  );

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Búsqueda global</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Encuentra canciones, maquetas, featurings, proyectos y eventos
        </p>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Buscar en todo el catálogo…"
          className="w-full bg-card border border-border rounded-xl pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
          aria-label="Búsqueda global"
          autoComplete="off"
        />
        {searching ? (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        ) : query ? (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setSearched(false);
              setSelectedIndex(-1);
              setResultTypeFilter("all");
              router.replace("/buscar", { scroll: false });
              inputRef.current?.focus();
            }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* Results */}
      {searched && !searching && (
        <div className="space-y-5">
          {totalCount === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No se encontraron resultados para</p>
              <p className="font-medium text-foreground mt-1 mb-5">&ldquo;{query}&rdquo;</p>
              <p className="text-xs text-muted-foreground mb-3">¿Querés crearlo?</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {[
                  { label: "Nueva canción", href: "/discografia?new=1", icon: Disc3,      color: "text-primary" },
                  { label: "Nueva maqueta", href: "/maquetas?new=1",    icon: FileAudio,  color: "text-blue-400" },
                  { label: "Nueva collab",  href: "/collabs?new=1",     icon: Users,      color: "text-yellow-400" },
                  { label: "Nuevo proyecto",href: "/proyectos?new=1",   icon: FolderOpen, color: "text-purple-400" },
                ].map(({ label, href, icon: Icon, color }) => (
                  <a key={href} href={href}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border hover:bg-secondary transition-colors">
                    <Icon className={cn("h-3 w-3", color)} />
                    {label}
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  {resultTypeFilter === "all" ? totalCount : displayedCount} resultado{(resultTypeFilter === "all" ? totalCount : displayedCount) !== 1 ? "s" : ""} para &ldquo;{query}&rdquo;
                  {selectedIndex >= 0 && (
                    <span className="ml-2 text-primary">
                      · {selectedIndex + 1}/{displayedCount} seleccionado
                    </span>
                  )}
                </p>
              </div>

              {/* Type filter chips — only show when 2+ types have results */}
              {Object.keys(grouped).length > 1 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { setResultTypeFilter("all"); setSelectedIndex(-1); }}
                    className={cn(
                      "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors",
                      resultTypeFilter === "all"
                        ? "bg-primary/10 border-primary/30 text-primary font-medium"
                        : "border-border text-muted-foreground hover:text-foreground bg-secondary"
                    )}
                  >
                    Todos
                    <span className="tabular-nums opacity-70">{totalCount}</span>
                  </button>
                  {TYPE_ORDER.filter((t) => grouped[t]?.length).map((type) => {
                    const meta = TYPE_META[type as SearchResult["type"]];
                    const Icon = meta.icon;
                    const count = grouped[type].length;
                    const isActive = resultTypeFilter === type;
                    return (
                      <button
                        key={type}
                        onClick={() => { setResultTypeFilter(isActive ? "all" : type as SearchResult["type"]); setSelectedIndex(-1); }}
                        className={cn(
                          "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors",
                          isActive
                            ? "bg-secondary border-border text-foreground font-medium ring-1 ring-inset ring-border"
                            : "border-border text-muted-foreground hover:text-foreground bg-secondary hover:border-border/80"
                        )}
                      >
                        <Icon className={cn("h-3 w-3 transition-colors", isActive ? meta.color : "text-muted-foreground")} />
                        {meta.label}{count !== 1 ? "s" : ""}
                        <span className={cn("tabular-nums", isActive ? "opacity-100 font-bold" : "opacity-70")}>{count}</span>
                        {isActive && <X className="h-2.5 w-2.5 opacity-60 ml-0.5" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {groupsWithIndex.map(({ type, items }) => {
                const meta = TYPE_META[type as SearchResult["type"]];
                const Icon = meta.icon;
                return (
                  <div key={type} className="bg-card border border-border rounded-xl overflow-hidden">
                    {/* Section header */}
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-secondary/30">
                      <Icon className={cn("h-3.5 w-3.5", meta.color)} />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {meta.label}s
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground">{items.length}</span>
                    </div>

                    {/* Items */}
                    <div className="divide-y divide-border">
                      {items.map((result) => (
                        <Link
                          key={result.id}
                          href={result.href}
                          ref={(el) => { resultsRef.current[result.globalIdx] = el; }}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 transition-colors group",
                            selectedIndex === result.globalIdx
                              ? "bg-primary/10"
                              : "hover:bg-secondary/50"
                          )}
                          onMouseEnter={() => setSelectedIndex(result.globalIdx)}
                        >
                          <Icon className={cn("h-4 w-4 flex-shrink-0", meta.color)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{result.title}</p>
                            {result.subtitle && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {result.subtitle}
                              </p>
                            )}
                          </div>
                          <ChevronRight className={cn(
                            "h-4 w-4 text-muted-foreground flex-shrink-0 transition-opacity",
                            selectedIndex === result.globalIdx ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                          )} />
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Idle state */}
      {!searched && !searching && query.length < 2 && (
        <div className="space-y-6">
          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  Búsquedas recientes
                </p>
                <button
                  onClick={() => {
                    try { localStorage.removeItem(RECENT_SEARCHES_KEY); } catch { /* ignore */ }
                    setRecentSearches([]);
                  }}
                  className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                >
                  Limpiar todo
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((q) => (
                  <button
                    key={q}
                    onClick={() => handleRecentClick(q)}
                    className="group flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border border-border hover:bg-secondary transition-colors"
                  >
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span>{q}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => handleRemoveRecent(q, e)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleRemoveRecent(q, e as unknown as React.MouseEvent); }}
                      className="ml-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                      aria-label={`Eliminar búsqueda "${q}"`}
                    >
                      <X className="h-2.5 w-2.5" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Browse shortcuts */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2.5 font-medium">Explorar</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Discografía", href: "/discografia", icon: Disc3,      color: "text-primary",       desc: "Canciones publicadas" },
                { label: "Maquetas",    href: "/maquetas",    icon: FileAudio,  color: "text-blue-400",      desc: "En producción" },
                { label: "Featurings",  href: "/collabs",     icon: Users,      color: "text-yellow-400",    desc: "Colaboraciones" },
                { label: "Proyectos",   href: "/proyectos",   icon: FolderOpen, color: "text-purple-400",    desc: "Álbumes y EPs" },
                { label: "Calendario",  href: "/calendario",  icon: Calendar,   color: "text-green-400",     desc: "Eventos y fechas" },
              ].map(({ label, href, icon: Icon, color, desc }) => (
                <a key={href} href={href}
                  className="flex items-start gap-3 p-3.5 rounded-xl border border-border bg-card hover:bg-secondary/50 transition-colors group">
                  <div className={cn("mt-0.5 flex-shrink-0", color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium group-hover:text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground flex-shrink-0 mt-0.5 ml-auto transition-colors" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick creates */}
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2.5 font-medium">Crear nuevo</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Canción",   href: "/discografia?new=1", icon: Disc3,      color: "text-primary" },
                { label: "Maqueta",   href: "/maquetas?new=1",    icon: FileAudio,  color: "text-blue-400" },
                { label: "Evento",    href: "/calendario?new=1",  icon: Calendar,   color: "text-green-400" },
                { label: "Collab",    href: "/collabs?new=1",     icon: Users,      color: "text-yellow-400" },
                { label: "Proyecto",  href: "/proyectos?new=1",   icon: FolderOpen, color: "text-purple-400" },
              ].map(({ label, href, icon: Icon, color }) => (
                <a key={href} href={href}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border border-border hover:bg-secondary transition-colors">
                  <Plus className="h-3 w-3 text-muted-foreground" />
                  <Icon className={cn("h-3 w-3", color)} />
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* Keyboard hint */}
          <p className="text-xs text-muted-foreground/60 flex items-center gap-1.5">
            <kbd className="text-[10px] bg-secondary border border-border px-1.5 py-0.5 rounded font-mono">↑↓</kbd>
            navegar resultados ·
            <kbd className="text-[10px] bg-secondary border border-border px-1.5 py-0.5 rounded font-mono">Enter</kbd>
            abrir ·
            <kbd className="text-[10px] bg-secondary border border-border px-1.5 py-0.5 rounded font-mono">Esc</kbd>
            cerrar
          </p>
        </div>
      )}
    </div>
  );
}
