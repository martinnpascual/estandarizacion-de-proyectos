"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, RotateCcw, AlertTriangle, Music, FileAudio, Users, FolderOpen, Calendar, Loader2, X } from "lucide-react";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { PageTransition, StaggerList, StaggerItem } from "@/components/ui/MotionWrapper";
import {
  getTrashItems,
  restoreTrashItem,
  permanentlyDeleteItem,
  emptyTrash,
  type TrashItem,
  type TrashItemType,
} from "@/lib/actions/papelera";

const TYPE_CONFIG: Record<TrashItemType, {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}> = {
  song:    { label: "Canción",      icon: Music,       color: "text-primary",    bg: "bg-primary/10" },
  draft:   { label: "Maqueta",      icon: FileAudio,   color: "text-blue-400",   bg: "bg-blue-500/10" },
  collab:  { label: "Colaboración", icon: Users,       color: "text-purple-400", bg: "bg-purple-500/10" },
  project: { label: "Proyecto",     icon: FolderOpen,  color: "text-orange-400", bg: "bg-orange-500/10" },
  event:   { label: "Evento",       icon: Calendar,    color: "text-green-400",  bg: "bg-green-500/10" },
};

function timeAgo(dateStr: string): string {
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diffDays === 0) return "hoy";
  if (diffDays === 1) return "ayer";
  if (diffDays < 7) return `hace ${diffDays} días`;
  if (diffDays < 30) return `hace ${Math.floor(diffDays / 7)} semana${Math.floor(diffDays / 7) > 1 ? "s" : ""}`;
  return `hace ${Math.floor(diffDays / 30)} mes${Math.floor(diffDays / 30) > 1 ? "es" : ""}`;
}

export default function PapeleraPage() {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<TrashItemType | "all">("all");
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const toast = useToast();
  const { confirm, ConfirmDialog } = useConfirm();

  const loadTrash = useCallback(async () => {
    setLoading(true);
    const { data } = await getTrashItems();
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadTrash(); }, [loadTrash]);

  async function handleRestore(item: TrashItem) {
    setRestoringId(item.id);
    const { error } = await restoreTrashItem(item.type, item.id);
    if (error) {
      toast.error(`Error al restaurar: ${error}`);
    } else {
      toast.success(`"${item.title}" restaurado correctamente`);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    }
    setRestoringId(null);
  }

  async function handlePermanentDelete(item: TrashItem) {
    const ok = await confirm({
      title: "Eliminar permanentemente",
      message: `¿Eliminar "${item.title}" para siempre? Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar para siempre",
      variant: "danger",
    });
    if (!ok) return;

    setDeletingId(item.id);
    const { error } = await permanentlyDeleteItem(item.type, item.id);
    if (error) {
      toast.error(`Error al eliminar: ${error}`);
    } else {
      toast.success(`"${item.title}" eliminado permanentemente`);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    }
    setDeletingId(null);
  }

  async function handleEmptyTrash() {
    const filtered = filter === "all" ? items : items.filter((i) => i.type === filter);
    if (filtered.length === 0) return;

    const ok = await confirm({
      title: "Vaciar papelera",
      message: `¿Eliminar permanentemente ${filtered.length} elemento${filtered.length !== 1 ? "s" : ""}? Esta acción no se puede deshacer.`,
      confirmLabel: "Vaciar papelera",
      variant: "danger",
    });
    if (!ok) return;

    const types = filter === "all"
      ? undefined
      : [filter as TrashItemType];

    const { error } = await emptyTrash(types);
    if (error) {
      toast.error(`Error al vaciar papelera: ${error}`);
    } else {
      toast.success("Papelera vaciada correctamente");
      if (filter === "all") {
        setItems([]);
      } else {
        setItems((prev) => prev.filter((i) => i.type !== filter));
      }
    }
  }

  const filteredItems = filter === "all" ? items : items.filter((i) => i.type === filter);
  const countByType = (type: TrashItemType) => items.filter((i) => i.type === type).length;

  return (
    <PageTransition>
      {ConfirmDialog}
      <div className="min-h-screen p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <Trash2 className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Papelera</h1>
              <p className="text-sm text-muted-foreground">
                {items.length} elemento{items.length !== 1 ? "s" : ""} eliminado{items.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {items.length > 0 && (
            <button
              onClick={handleEmptyTrash}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <X className="h-4 w-4" />
              Vaciar {filter !== "all" ? "selección" : "papelera"}
            </button>
          )}
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-500/5 border border-amber-500/20 rounded-xl mb-6">
          <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            Los elementos en la papelera pueden ser restaurados en cualquier momento. Al eliminarlos permanentemente no podrán recuperarse.
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
            }`}
          >
            Todos ({items.length})
          </button>
          {(Object.entries(TYPE_CONFIG) as [TrashItemType, typeof TYPE_CONFIG[TrashItemType]][]).map(([type, cfg]) => {
            const count = countByType(type);
            if (count === 0) return null;
            return (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === type ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                }`}
              >
                {cfg.label}s ({count})
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Cargando papelera...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center">
              <Trash2 className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <div className="text-center">
              <p className="text-base font-medium text-muted-foreground">Papelera vacía</p>
              <p className="text-sm text-muted-foreground/60 mt-1">No hay elementos eliminados</p>
            </div>
          </div>
        ) : (
          <StaggerList className="space-y-2">
            {filteredItems.map((item) => {
              const cfg = TYPE_CONFIG[item.type];
              const Icon = cfg.icon;
              const isRestoring = restoringId === item.id;
              const isDeleting = deletingId === item.id;

              return (
                <StaggerItem key={`${item.type}-${item.id}`}>
                  <div className="flex items-center gap-4 p-4 bg-card/60 border border-border/40 rounded-xl hover:border-border/60 transition-all">
                    <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`h-4 w-4 ${cfg.color}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color} flex-shrink-0`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {item.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                        )}
                        <span className="text-xs text-muted-foreground/50">
                          Eliminado {timeAgo(item.deleted_at)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleRestore(item)}
                        disabled={isRestoring || isDeleting}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                      >
                        {isRestoring ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                        Restaurar
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(item)}
                        disabled={isRestoring || isDeleting}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      >
                        {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        Eliminar
                      </button>
                    </div>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerList>
        )}
      </div>
    </PageTransition>
  );
}
