"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  createContext,
  useContext,
} from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Disc3,
  FileAudio,
  Users,
  FolderOpen,
  Calendar,
  Loader2,
  X,
  CornerDownLeft,
  LayoutDashboard,
  Share2,
  BarChart2,
  UserCog,
  UserCircle,
  Plus,
  ArrowRight,
  Bell,
  Clock,
} from "lucide-react";

const RECENT_KEY = "ga_recent_searches";
import { globalSearch, type SearchResult } from "@/lib/actions/search";
import { cn } from "@/lib/utils";

// ── Context ─────────────────────────────────────────────────────────────
interface CommandMenuContextValue {
  open: () => void;
  close: () => void;
}

const CommandMenuContext = createContext<CommandMenuContextValue>({
  open: () => {},
  close: () => {},
});

export function useCommandMenu() {
  return useContext(CommandMenuContext);
}

// ── Provider ─────────────────────────────────────────────────────────────
export function CommandMenuProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const openMenu = useCallback(() => setIsOpen(true), []);
  const closeMenu = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <CommandMenuContext.Provider value={{ open: openMenu, close: closeMenu }}>
      {children}
      {isOpen && <CommandMenuModal onClose={closeMenu} />}
    </CommandMenuContext.Provider>
  );
}

// ── Static data ───────────────────────────────────────────────────────────
interface NavItem {
  kind: "nav";
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  color: string;
}

interface CreateItem {
  kind: "create";
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  color: string;
}

type StaticItem = NavItem | CreateItem;

const NAV_ITEMS: NavItem[] = [
  { kind: "nav", id: "nav-dashboard",    label: "Dashboard",      description: "Vista general y actividad reciente",        href: "/dashboard",    icon: LayoutDashboard, color: "text-muted-foreground" },
  { kind: "nav", id: "nav-discografia",  label: "Discografía",    description: "Canciones publicadas",                      href: "/discografia",  icon: Disc3,           color: "text-primary"          },
  { kind: "nav", id: "nav-maquetas",     label: "Maquetas",       description: "Borradores y demos en producción",          href: "/maquetas",     icon: FileAudio,       color: "text-blue-400"         },
  { kind: "nav", id: "nav-collabs",      label: "Featurings",     description: "Colaboraciones con otros artistas",         href: "/collabs",      icon: Users,           color: "text-yellow-400"       },
  { kind: "nav", id: "nav-proyectos",    label: "Proyectos",      description: "Álbumes, EPs y mixtapes",                   href: "/proyectos",    icon: FolderOpen,      color: "text-purple-400"       },
  { kind: "nav", id: "nav-calendario",   label: "Calendario",     description: "Lanzamientos, sesiones y eventos",          href: "/calendario",   icon: Calendar,        color: "text-green-400"        },
  { kind: "nav", id: "nav-redes",        label: "Redes sociales", description: "Estadísticas de plataformas",               href: "/redes",        icon: Share2,          color: "text-pink-400"         },
  { kind: "nav", id: "nav-estadisticas", label: "Estadísticas",   description: "Análisis de discografía y maquetas",        href: "/estadisticas", icon: BarChart2,       color: "text-orange-400"       },
  { kind: "nav", id: "nav-equipo",          label: "Equipo",           description: "Miembros y colaboradores del estudio",      href: "/equipo",          icon: UserCog,         color: "text-cyan-400"         },
  { kind: "nav", id: "nav-notificaciones", label: "Notificaciones",   description: "Eventos, deadlines y maquetas listas",      href: "/notificaciones",  icon: Bell,            color: "text-primary"          },
  { kind: "nav", id: "nav-perfil",         label: "Mi perfil",        description: "Ajustes de cuenta y conexiones",            href: "/perfil",          icon: UserCircle,      color: "text-muted-foreground" },
];

const CREATE_ITEMS: CreateItem[] = [
  { kind: "create", id: "new-song",    label: "Nueva canción",  description: "Agregar a Discografía",   href: "/discografia?new=1", icon: Disc3,     color: "text-primary"    },
  { kind: "create", id: "new-draft",   label: "Nueva maqueta",  description: "Agregar a Maquetas",      href: "/maquetas?new=1",    icon: FileAudio, color: "text-blue-400"   },
  { kind: "create", id: "new-collab",  label: "Nueva collab",   description: "Agregar a Featurings",    href: "/collabs?new=1",     icon: Users,     color: "text-yellow-400" },
  { kind: "create", id: "new-project", label: "Nuevo proyecto", description: "Agregar a Proyectos",     href: "/proyectos?new=1",   icon: FolderOpen,color: "text-purple-400" },
  { kind: "create", id: "new-event",   label: "Nuevo evento",   description: "Agregar a Calendario",    href: "/calendario?new=1",  icon: Calendar,  color: "text-green-400"  },
];

const TYPE_META: Record<
  SearchResult["type"],
  { label: string; icon: React.ElementType; color: string }
> = {
  song:    { label: "Canción",   icon: Disc3,     color: "text-primary"    },
  draft:   { label: "Maqueta",   icon: FileAudio, color: "text-blue-400"   },
  collab:  { label: "Featuring", icon: Users,     color: "text-yellow-400" },
  project: { label: "Proyecto",  icon: FolderOpen,color: "text-purple-400" },
  event:   { label: "Evento",    icon: Calendar,  color: "text-green-400"  },
};

// ── Helpers ───────────────────────────────────────────────────────────────
function matchesQuery(text: string, q: string) {
  return text.toLowerCase().includes(q.toLowerCase());
}

// ── Modal ────────────────────────────────────────────────────────────────
function CommandMenuModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Auto-focus and load recent searches on open
  useEffect(() => {
    inputRef.current?.focus();
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecentSearches((JSON.parse(raw) as string[]).slice(0, 4));
    } catch { /* ignore */ }
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const { data } = await globalSearch(q);
    setResults(data);
    setActiveIdx(0);
    setSearching(false);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setActiveIdx(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  }

  function navigate(href: string) {
    router.push(href);
    onClose();
  }

  // Build flat list of all keyboard-navigable items
  const isSearching = query.trim().length >= 2;

  // When searching: search results + matching nav/create items
  // When idle: nav items + create items
  type FlatItem =
    | { kind: "search"; data: SearchResult }
    | { kind: "nav" | "create"; data: StaticItem };

  const flatItems: FlatItem[] = [];

  if (isSearching) {
    results.forEach((r) => flatItems.push({ kind: "search", data: r }));
    // Add nav items matching the query
    NAV_ITEMS.filter((n) => matchesQuery(n.label, query) || matchesQuery(n.description, query))
      .forEach((n) => flatItems.push({ kind: "nav", data: n }));
    CREATE_ITEMS.filter((c) => matchesQuery(c.label, query) || matchesQuery(c.description, query))
      .forEach((c) => flatItems.push({ kind: "create", data: c }));
  } else {
    NAV_ITEMS.forEach((n) => flatItems.push({ kind: "nav", data: n }));
    CREATE_ITEMS.forEach((c) => flatItems.push({ kind: "create", data: c }));
  }

  const totalItems = flatItems.length;

  function selectItem(idx: number) {
    const item = flatItems[idx];
    if (!item) return;
    if (item.kind === "search") {
      navigate((item.data as SearchResult).href);
    } else {
      navigate((item.data as StaticItem).href);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, totalItems - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectItem(activeIdx);
    }
  }

  // Keep active item visible
  useEffect(() => {
    const el = listRef.current?.children[activeIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  // ── Render helpers ───────────────────────────────────────────────────────
  function renderSearchResult(result: SearchResult, idx: number) {
    const meta = TYPE_META[result.type];
    const Icon = meta.icon;
    return (
      <button
        key={result.id}
        onClick={() => navigate(result.href)}
        onMouseEnter={() => setActiveIdx(idx)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all",
          idx === activeIdx ? "bg-secondary" : "hover:bg-secondary/50"
        )}
      >
        <Icon className={cn("h-4 w-4 flex-shrink-0", meta.color)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{result.title}</p>
          {result.subtitle && (
            <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground bg-secondary/80 px-1.5 py-0.5 rounded flex-shrink-0">
          {meta.label}
        </span>
        {idx === activeIdx && (
          <CornerDownLeft className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        )}
      </button>
    );
  }

  function renderNavItem(item: NavItem, idx: number) {
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        onClick={() => navigate(item.href)}
        onMouseEnter={() => setActiveIdx(idx)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-2 text-left transition-all",
          idx === activeIdx ? "bg-secondary" : "hover:bg-secondary/50"
        )}
      >
        <Icon className={cn("h-4 w-4 flex-shrink-0", item.color)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.label}</p>
          <p className="text-[11px] text-muted-foreground truncate">{item.description}</p>
        </div>
        {idx === activeIdx ? (
          <CornerDownLeft className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        ) : (
          <ArrowRight className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
        )}
      </button>
    );
  }

  function renderCreateItem(item: CreateItem, idx: number) {
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        onClick={() => navigate(item.href)}
        onMouseEnter={() => setActiveIdx(idx)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-2 text-left transition-all",
          idx === activeIdx ? "bg-secondary" : "hover:bg-secondary/50"
        )}
      >
        <div className={cn("w-4 h-4 flex-shrink-0 relative flex items-center justify-center")}>
          <Icon className={cn("h-3.5 w-3.5", item.color)} />
          <Plus className="h-2 w-2 text-foreground absolute -bottom-0.5 -right-0.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.label}</p>
          <p className="text-[11px] text-muted-foreground truncate">{item.description}</p>
        </div>
        {idx === activeIdx ? (
          <CornerDownLeft className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        ) : (
          <ArrowRight className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
        )}
      </button>
    );
  }

  // Section separator rendered between sections
  function SectionLabel({ label }: { label: string }) {
    return (
      <div className="px-4 py-1.5 border-b border-border/50">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
    );
  }

  // ── Build sections for rendering ─────────────────────────────────────────
  const searchResults = flatItems.filter((f) => f.kind === "search");
  const navResults    = flatItems.filter((f) => f.kind === "nav");
  const createResults = flatItems.filter((f) => f.kind === "create");

  // Map each flatItem to its global index
  const searchOffset = 0;
  const navOffset    = searchResults.length;
  const createOffset = navOffset + navResults.length;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-[10%] left-1/2 -translate-x-1/2 z-[101] w-full max-w-xl px-4">
        <div className="bg-card border border-border/60 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/60">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Buscar o navegar…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {searching ? (
              <Loader2 className="h-4 w-4 text-muted-foreground animate-spin flex-shrink-0" />
            ) : query ? (
              <button
                onClick={() => {
                  setQuery("");
                  setResults([]);
                  setActiveIdx(0);
                  inputRef.current?.focus();
                }}
                className="p-0.5 rounded-xl hover:bg-secondary text-muted-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                ESC
              </kbd>
            )}
          </div>

          {/* Body */}
          <div ref={listRef} className="max-h-[400px] overflow-y-auto">
            {/* Search results section */}
            {searchResults.length > 0 && (
              <>
                <SectionLabel label={`Resultados · ${searchResults.length}`} />
                {searchResults.map((f, localI) =>
                  renderSearchResult(f.data as SearchResult, searchOffset + localI)
                )}
              </>
            )}

            {/* "No results" when searched but nothing found */}
            {isSearching && !searching && searchResults.length === 0 && navResults.length === 0 && createResults.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Sin resultados para &ldquo;{query}&rdquo;
              </div>
            )}

            {/* Recent searches — shown only when idle */}
            {!isSearching && recentSearches.length > 0 && (
              <>
                <SectionLabel label="Búsquedas recientes" />
                <div className="px-4 py-2 flex flex-wrap gap-1.5">
                  {recentSearches.map((q) => (
                    <button
                      key={q}
                      onClick={() => navigate(`/buscar?q=${encodeURIComponent(q)}`)}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-all active:scale-95"
                    >
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      {q}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Nav section */}
            {navResults.length > 0 && (
              <>
                <SectionLabel label={isSearching ? "Páginas" : "Navegar"} />
                {navResults.map((f, localI) =>
                  renderNavItem(f.data as NavItem, navOffset + localI)
                )}
              </>
            )}

            {/* Create section */}
            {createResults.length > 0 && (
              <>
                <SectionLabel label="Crear nuevo" />
                {createResults.map((f, localI) =>
                  renderCreateItem(f.data as CreateItem, createOffset + localI)
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border/60 bg-secondary/20">
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <kbd className="bg-secondary px-1 rounded">↑↓</kbd> navegar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-secondary px-1 rounded">↵</kbd> abrir
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-secondary px-1 rounded">ESC</kbd> cerrar
              </span>
            </div>
            {isSearching && results.length > 0 && (
              <span className="text-[10px] text-muted-foreground hidden sm:block">
                {results.length} resultado{results.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
