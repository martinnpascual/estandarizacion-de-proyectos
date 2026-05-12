"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare,
  Send,
  Loader2,
  Check,
  Trash2,
  Clock,
  Pencil,
  X,
} from "lucide-react";
import { useAudioPlayerContext } from "@/components/audio/AudioPlayer";
import {
  getComments,
  createComment,
  resolveComment,
  deleteComment,
  updateComment,
} from "@/lib/actions/comments";
import { formatTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Comment } from "@/types/database";

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins}m`;
  if (hours < 24) return `hace ${hours}h`;
  if (days < 7) return `hace ${days}d`;
  return new Date(isoDate).toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

const MAX_CHARS = 500;

interface CommentsPanelProps {
  song_id?: string;
  draft_id?: string;
  currentUserId?: string;
}

export default function CommentsPanel({
  song_id,
  draft_id,
  currentUserId,
}: CommentsPanelProps) {
  const player = useAudioPlayerContext();

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newBody, setNewBody] = useState("");
  const [newTimestamp, setNewTimestamp] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showResolved, setShowResolved] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const commentRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!song_id && !draft_id) return;

    setLoading(true);
    getComments({ song_id, draft_id }).then(({ data, error }) => {
      if (error) {
        setError(error);
      } else {
        const list = data ?? [];
        setComments(list);
        // Sync markers con el player
        player.setCommentMarkers(
          list
            .filter((c) => !c.is_resolved && !c.is_deleted)
            .map((c) => c.timestamp_seconds)
        );
      }
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song_id, draft_id]);

  // Track active comment based on current playback position
  useEffect(() => {
    const active = comments
      .filter((c) => !c.is_resolved && !c.is_deleted)
      .reduce<Comment | null>((best, c) => {
        if (c.timestamp_seconds > player.currentTime) return best;
        if (!best || c.timestamp_seconds > best.timestamp_seconds) return c;
        return best;
      }, null);
    const newId = active?.id ?? null;
    if (newId !== activeCommentId) {
      setActiveCommentId(newId);
      if (newId && commentRefs.current[newId]) {
        commentRefs.current[newId]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.currentTime, comments]);

  async function handleSaveEdit(comment: Comment) {
    if (!editBody.trim()) return;
    setSavingEdit(true);
    const { error } = await updateComment(comment.id, editBody);
    if (!error) {
      setComments((prev) => prev.map((c) => c.id === comment.id ? { ...c, body: editBody.trim() } : c));
    }
    setSavingEdit(false);
    setEditingId(null);
    setEditBody("");
  }

  function handleAddAtCurrentTime() {
    setNewTimestamp(Math.floor(player.currentTime));
    textareaRef.current?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newBody.trim()) return;

    setSubmitting(true);
    const result = await createComment({
      body: newBody.trim(),
      timestamp_seconds: newTimestamp,
      song_id: song_id ?? null,
      draft_id: draft_id ?? null,
      parent_id: null,
    });

    if (result.error || !result.data) {
      setError(result.error ?? "Error al crear comentario");
    } else {
      const updated = [...comments, result.data].sort(
        (a, b) => a.timestamp_seconds - b.timestamp_seconds
      );
      setComments(updated);
      player.setCommentMarkers(
        updated
          .filter((c) => !c.is_resolved && !c.is_deleted)
          .map((c) => c.timestamp_seconds)
      );
      setNewBody("");
      setNewTimestamp(0);
    }
    setSubmitting(false);
  }

  async function handleResolve(comment: Comment) {
    const { error } = await resolveComment(comment.id);
    if (!error) {
      const updated = comments.map((c) =>
        c.id === comment.id ? { ...c, is_resolved: true } : c
      );
      setComments(updated);
      player.setCommentMarkers(
        updated
          .filter((c) => !c.is_resolved && !c.is_deleted)
          .map((c) => c.timestamp_seconds)
      );
    }
  }

  async function handleDelete(comment: Comment) {
    const { error } = await deleteComment(comment.id);
    if (!error) {
      const updated = comments.filter((c) => c.id !== comment.id);
      setComments(updated);
      player.setCommentMarkers(
        updated
          .filter((c) => !c.is_resolved)
          .map((c) => c.timestamp_seconds)
      );
    }
  }

  const visible = comments.filter(
    (c) => showResolved || !c.is_resolved
  );

  const resolvedCount = comments.filter((c) => c.is_resolved).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          Comentarios
          {comments.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({comments.length})
            </span>
          )}
        </h3>
        {resolvedCount > 0 && (
          <button
            onClick={() => setShowResolved((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground transition-all active:scale-95"
          >
            {showResolved ? "Ocultar resueltos" : `Ver ${resolvedCount} resueltos`}
          </button>
        )}
      </div>

      {/* Lista */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-500 p-4">{error}</p>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <MessageSquare className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Sin comentarios</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Hacé click en &quot;+ En {formatTime(Math.floor(player.currentTime))}&quot;
              mientras escuchás
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {visible.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                isOwn={comment.created_by === currentUserId}
                isActive={activeCommentId === comment.id}
                isEditing={editingId === comment.id}
                editBody={editBody}
                savingEdit={savingEdit}
                onSeek={() => player.seek(comment.timestamp_seconds)}
                onResolve={() => handleResolve(comment)}
                onDelete={() => handleDelete(comment)}
                onStartEdit={() => { setEditingId(comment.id); setEditBody(comment.body); }}
                onCancelEdit={() => { setEditingId(null); setEditBody(""); }}
                onSaveEdit={() => handleSaveEdit(comment)}
                onEditBodyChange={(v) => setEditBody(v.slice(0, MAX_CHARS))}
                commentRef={(el) => { commentRefs.current[comment.id] = el; }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border/60 p-3 space-y-2">
        {/* Timestamp selector */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleAddAtCurrentTime}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-all active:scale-95 text-xs text-muted-foreground hover:text-foreground"
          >
            <Clock className="h-3.5 w-3.5" />
            + En {formatTime(Math.floor(player.currentTime))}
          </button>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>Timestamp:</span>
            <input
              type="number"
              min={0}
              value={newTimestamp}
              onChange={(e) =>
                setNewTimestamp(Math.max(0, Number(e.target.value)))
              }
              className="w-16 px-2 py-1 bg-background border border-border/60 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <span className="text-muted-foreground/60">
              ({formatTime(newTimestamp)})
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={newBody}
              onChange={(e) => setNewBody(e.target.value.slice(0, MAX_CHARS))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Escribe un comentario... (Enter para enviar)"
              rows={2}
              className="w-full px-3 py-2 bg-background border border-border/60 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 pb-5"
            />
            {newBody.length > 0 && (
              <span className={cn(
                "absolute bottom-1.5 right-2 text-[9px] tabular-nums",
                newBody.length > MAX_CHARS * 0.9 ? "text-orange-400" : "text-muted-foreground/50"
              )}>
                {newBody.length}/{MAX_CHARS}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting || !newBody.trim()}
            className="self-end p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/80 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

interface CommentItemProps {
  comment: Comment;
  isOwn: boolean;
  isActive: boolean;
  isEditing: boolean;
  editBody: string;
  savingEdit: boolean;
  onSeek: () => void;
  onResolve: () => void;
  onDelete: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onEditBodyChange: (v: string) => void;
  commentRef: (el: HTMLDivElement | null) => void;
}

function CommentItem({
  comment, isOwn, isActive, isEditing, editBody, savingEdit,
  onSeek, onResolve, onDelete, onStartEdit, onCancelEdit, onSaveEdit,
  onEditBodyChange, commentRef,
}: CommentItemProps) {
  return (
    <div
      ref={commentRef}
      className={cn(
        "px-4 py-3 group transition-all",
        isActive ? "bg-yellow-500/5 border-l-2 border-yellow-500/40" : "hover:bg-secondary/30",
        comment.is_resolved && "opacity-50"
      )}
    >
      <div className="flex items-start gap-2">
        {/* Timestamp clickeable */}
        <button
          onClick={onSeek}
          className={cn(
            "flex-shrink-0 px-1.5 py-0.5 rounded-xl text-[11px] font-mono transition-all active:scale-95 mt-0.5",
            isActive
              ? "bg-yellow-500/30 text-yellow-400 hover:bg-yellow-500/40"
              : "bg-yellow-500/15 text-yellow-500 hover:bg-yellow-500/25"
          )}
          title="Ir a este momento"
        >
          {formatTime(comment.timestamp_seconds)}
        </button>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xs font-medium">
              {comment.author?.full_name ?? "Usuario"}
            </span>
            <span className="text-[10px] text-muted-foreground" title={new Date(comment.created_at).toLocaleString("es-AR")}>
              {relativeTime(comment.created_at)}
            </span>
            {comment.is_resolved && (
              <span className="text-[10px] text-green-500 font-medium">✓ resuelto</span>
            )}
          </div>

          {isEditing ? (
            <div className="mt-1 space-y-1.5">
              <textarea
                value={editBody}
                onChange={(e) => onEditBodyChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSaveEdit(); }
                  if (e.key === "Escape") onCancelEdit();
                }}
                rows={2}
                autoFocus
                className="w-full px-2 py-1.5 bg-background border border-primary/40 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onSaveEdit}
                  disabled={savingEdit || !editBody.trim()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  {savingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                  Guardar
                </button>
                <button
                  onClick={onCancelEdit}
                  className="px-2.5 py-1 rounded-xl border border-border/60 text-xs hover:bg-secondary transition-all active:scale-95"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{comment.body}</p>
          )}
        </div>

        {/* Acciones */}
        {!isEditing && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            {!comment.is_resolved && (
              <button
                onClick={onResolve}
                title="Marcar como resuelto"
                className="p-1 rounded-xl hover:bg-green-500/15 text-muted-foreground hover:text-green-500 transition-all active:scale-95"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            )}
            {isOwn && !comment.is_resolved && (
              <button
                onClick={onStartEdit}
                title="Editar"
                className="p-1 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-all active:scale-95"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {isOwn && (
              <button
                onClick={onDelete}
                title="Eliminar"
                className="p-1 rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all active:scale-95"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
