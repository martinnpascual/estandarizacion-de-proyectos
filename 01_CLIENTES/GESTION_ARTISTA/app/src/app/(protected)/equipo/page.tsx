"use client";

import { useState, useEffect, useRef } from "react";
import {
  UserCog,
  Plus,
  Mail,
  Shield,
  Loader2,
  X,
  Crown,
  ChevronDown,
  Search,
  Users,
  Clock,
  Copy,
  Check,
  AlertTriangle,
  ArrowUpDown,
  Link2,
} from "lucide-react";
import {
  getTeamMembers,
  getPendingInvitations,
  inviteTeamMember,
  revokeInvitation,
  updateMemberRole,
  refreshInviteToken,
  InviteSchema,
  type InviteFormData,
} from "@/lib/actions/team";
import { useUser } from "@/hooks/useUser";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/ToastProvider";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import type { Profile, TeamInvitation, UserRole } from "@/types/database";

// ─── Avatar color helper ──────────────────────────────────────────────────────
const AVATAR_PALETTES = [
  { bg: "bg-violet-500/25", text: "text-violet-300", border: "border-violet-500/30" },
  { bg: "bg-blue-500/25",   text: "text-blue-300",   border: "border-blue-500/30" },
  { bg: "bg-emerald-500/25",text: "text-emerald-300",border: "border-emerald-500/30" },
  { bg: "bg-amber-500/25",  text: "text-amber-300",  border: "border-amber-500/30" },
  { bg: "bg-pink-500/25",   text: "text-pink-300",   border: "border-pink-500/30" },
  { bg: "bg-cyan-500/25",   text: "text-cyan-300",   border: "border-cyan-500/30" },
  { bg: "bg-orange-500/25", text: "text-orange-300", border: "border-orange-500/30" },
  { bg: "bg-indigo-500/25", text: "text-indigo-300", border: "border-indigo-500/30" },
];
function getAvatarPalette(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = seed.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_PALETTES[Math.abs(h) % AVATAR_PALETTES.length];
}
function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return (email?.[0] ?? "?").toUpperCase();
}

const ROLE_META: Record<
  UserRole,
  { label: string; color: string; borderColor: string; iconColor: string }
> = {
  artista: {
    label: "Artista",
    color: "bg-primary/15 text-primary",
    borderColor: "border-primary/30",
    iconColor: "text-primary",
  },
  productor: {
    label: "Productor",
    color: "bg-blue-500/15 text-blue-400",
    borderColor: "border-blue-500/30",
    iconColor: "text-blue-400",
  },
  manager: {
    label: "Manager",
    color: "bg-yellow-500/15 text-yellow-400",
    borderColor: "border-yellow-500/30",
    iconColor: "text-yellow-400",
  },
};

type InviteErrors = Partial<Record<keyof InviteFormData | "root", string>>;

export default function EquipoPage() {
  const toast = useToast();
  const { confirm, ConfirmDialog } = useConfirm();
  const { user } = useUser();
  const [members, setMembers] = useState<Profile[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteFormData>({ email: "", role: "productor" });
  const [inviteErrors, setInviteErrors] = useState<InviteErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<string | null>(null);
  const [generatingLinkId, setGeneratingLinkId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "todos">(() =>
    typeof window !== "undefined"
      ? (localStorage.getItem("equipo-role-filter") as UserRole | "todos") || "todos"
      : "todos"
  );
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [memberSort, setMemberSort] = useState<"name" | "recent">(() =>
    typeof window !== "undefined"
      ? (localStorage.getItem("equipo-member-sort") as "name" | "recent") || "recent"
      : "recent"
  );
  const emailRef = useRef<HTMLInputElement>(null);

  // Auto-focus email input; Escape closes form; N = nueva invitación
  useEffect(() => {
    if (showInviteForm) {
      setTimeout(() => emailRef.current?.focus(), 50);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && showInviteForm) { setShowInviteForm(false); return; }
      if ((e.key === "n" || e.key === "N") && !e.metaKey && !e.ctrlKey && !showInviteForm) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
        e.preventDefault();
        setShowInviteForm(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showInviteForm]);

  function handleCopyEmail(id: string, email: string) {
    navigator.clipboard.writeText(email).then(() => {
      setCopiedEmail(id);
      setTimeout(() => setCopiedEmail(null), 2000);
    });
  }

  async function handleCopyInviteLink(inv: TeamInvitation) {
    setGeneratingLinkId(inv.id);
    // Generate (or refresh) the token and return the URL
    const { url, error } = await refreshInviteToken(inv.id);
    setGeneratingLinkId(null);

    if (error || !url) {
      toast.error(error ?? "No se pudo generar el link");
      return;
    }

    // Update the local state with the new token URL (optional — just for UX)
    await navigator.clipboard.writeText(url);
    setCopiedLinkId(inv.id);
    setTimeout(() => setCopiedLinkId(null), 3000);
    toast.success("Link de invitación copiado al portapapeles", 4000);
  }

  function getInviteExpiry(createdAt: string): { label: string; isExpiring: boolean } {
    const created = new Date(createdAt);
    const expiry = new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000);
    const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / 86_400_000);
    if (daysLeft <= 0) return { label: "Expirada", isExpiring: true };
    if (daysLeft === 1) return { label: "Expira mañana", isExpiring: true };
    if (daysLeft <= 3) return { label: `Expira en ${daysLeft}d`, isExpiring: true };
    return { label: `Válida por ${daysLeft}d`, isExpiring: false };
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { localStorage.setItem("equipo-role-filter", roleFilter); }, [roleFilter]);
  useEffect(() => { localStorage.setItem("equipo-member-sort", memberSort); }, [memberSort]);

  async function load() {
    setLoading(true);
    const [membersRes, invitesRes] = await Promise.all([
      getTeamMembers(),
      getPendingInvitations(),
    ]);
    setMembers(membersRes.data ?? []);
    setInvitations(invitesRes.data ?? []);
    setLoading(false);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const parsed = InviteSchema.safeParse(inviteForm);
    if (!parsed.success) {
      const errs: InviteErrors = {};
      parsed.error.errors.forEach((err) => {
        const k = err.path[0] as keyof InviteFormData;
        if (!errs[k]) errs[k] = err.message;
      });
      setInviteErrors(errs);
      return;
    }

    setSubmitting(true);
    const result = await inviteTeamMember(parsed.data);

    if (!result.data) {
      // Error total — mostrar en el formulario
      setInviteErrors({ root: result.error ?? "Error desconocido" });
    } else if (result.error) {
      // Éxito parcial — la invitación se guardó pero el email falló
      setInvitations((prev) => [result.data!, ...prev]);
      setShowInviteForm(false);
      setInviteForm({ email: "", role: "productor" });
      toast.info(`Invitación guardada para ${parsed.data.email}. El email automático falló — compartile el link manualmente.`, 7000);
    } else {
      // Éxito total
      setInvitations((prev) => [result.data!, ...prev]);
      setShowInviteForm(false);
      setInviteForm({ email: "", role: "productor" });
      toast.success(`Invitación enviada a ${parsed.data.email}`);
    }

    setSubmitting(false);
  }

  async function handleRevoke(invitation: TeamInvitation) {
    if (!await confirm({ title: `¿Revocar invitación?`, message: `Se cancelará la invitación enviada a ${invitation.email}.`, confirmLabel: "Revocar" })) return;
    setRevokingId(invitation.id);
    const { error } = await revokeInvitation(invitation.id);
    if (error) toast.error(error);
    else setInvitations((prev) => prev.filter((i) => i.id !== invitation.id));
    setRevokingId(null);
  }

  async function handleRoleChange(member: Profile, role: UserRole) {
    if (role === member.role) return;
    setUpdatingRoleId(member.id);
    const { error } = await updateMemberRole(member.id, role);
    if (error) toast.error(error);
    else setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, role } : m)));
    setUpdatingRoleId(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-premium relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/8 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-blue-400/6 rounded-full blur-2xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/30 to-cyan-600/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
              <UserCog className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight gradient-text">Equipo</h1>
              <p className="text-muted-foreground text-xs mt-0.5">
                Gestión de miembros y roles del equipo
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setInviteForm({ email: "", role: "productor" });
              setInviteErrors({});
              setShowInviteForm(true);
            }}
            title="Invitar miembro (N)"
            className="btn-shine flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 hover:scale-[1.02] transition-all active:scale-95 text-sm font-black shadow-[0_0_20px_hsl(var(--primary)/0.35)]"
          >
            <Plus className="h-4 w-4" />
            Invitar miembro
            <kbd className="hidden md:inline-flex ml-1 text-[9px] bg-primary-foreground/20 px-1 py-0.5 rounded font-mono">N</kbd>
          </button>
        </div>
      </div>

      {/* Roles info */}
      <div className="grid sm:grid-cols-3 gap-4">
        {(Object.entries(ROLE_META) as [UserRole, typeof ROLE_META[UserRole]][]).map(
          ([role, meta]) => {
            const count = members.filter(m => m.role === role).length;
            const isFiltered = roleFilter === role;
            const isClickable = !loading && count > 0 && role !== "artista";
            return (
              <div
                key={role}
                onClick={isClickable ? () => setRoleFilter(isFiltered ? "todos" : role) : undefined}
                className={cn(
                  "card-premium rounded-2xl p-4 transition-all",
                  isClickable && "cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_28px_hsl(0_0%_0%/0.28)]",
                  isFiltered
                    ? "ring-1 ring-primary/50 shadow-[0_0_16px_hsl(var(--primary)/0.12)] border-primary/30"
                    : ""
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className={cn("h-4 w-4 drop-shadow-[0_0_6px_currentColor]", meta.iconColor)} />
                    <h3 className="font-black text-sm">{meta.label}</h3>
                  </div>
                  {!loading && count > 0 && (
                    <span className={cn("text-[10px] font-black px-1.5 py-0.5 rounded-full tabular-nums border", meta.color, meta.borderColor, "shadow-[0_0_6px_currentColor/30]")}>
                      {count}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {role === "artista" &&
                    "Acceso total. Puede crear, editar, eliminar y gestionar el equipo."}
                  {role === "productor" &&
                    "Puede ver y subir audio, dejar comentarios con timestamps y ver el calendario."}
                  {role === "manager" &&
                    "Puede ver todo, gestionar calendario y ver estadísticas de redes."}
                </p>
              </div>
            );
          }
        )}
      </div>

      {/* Stats strip + Search */}
      {!loading && (members.length > 0 || invitations.length > 0) && (
        <div className="space-y-3">
          {/* Role breakdown chips */}
          {members.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {(Object.entries(ROLE_META) as [UserRole, typeof ROLE_META[UserRole]][]).map(([role, meta]) => {
                const count = members.filter(m => m.role === role).length;
                if (count === 0) return null;
                return (
                  <span key={role} className={cn(
                    "flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border",
                    meta.color, meta.borderColor
                  )}>
                    <Shield className="h-3 w-3 flex-shrink-0" />
                    <span>{meta.label}</span>
                    <span className="font-black tabular-nums">{count}</span>
                  </span>
                );
              })}
              <span className="flex items-center gap-1.5 text-[11px] bg-secondary text-muted-foreground px-2.5 py-1 rounded-full">
                <Users className="h-3 w-3 flex-shrink-0" />
                <span>{members.length} miembro{members.length !== 1 ? "s" : ""}</span>
              </span>
              {invitations.length > 0 && (
                <span className="flex items-center gap-1.5 text-[11px] bg-yellow-500/10 text-yellow-400 px-2.5 py-1 rounded-full border border-yellow-500/20">
                  <Clock className="h-3 w-3 flex-shrink-0" />
                  <span>{invitations.length} invitación{invitations.length !== 1 ? "es" : ""} pendiente{invitations.length !== 1 ? "s" : ""}</span>
                </span>
              )}
            </div>
          )}

          {/* Role filter */}
          {members.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setRoleFilter("todos")}
                className={cn(
                  "flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-all active:scale-95",
                  roleFilter === "todos"
                    ? "bg-primary/10 border-primary/30 text-primary font-semibold"
                    : "border-border text-muted-foreground hover:text-foreground bg-secondary"
                )}
              >
                Todos
                <span className="tabular-nums opacity-70">{members.length}</span>
              </button>
              {(Object.entries(ROLE_META) as [UserRole, typeof ROLE_META[UserRole]][]).map(([role, meta]) => {
                const count = members.filter(m => m.role === role).length;
                if (count === 0) return null;
                return (
                  <button
                    key={role}
                    onClick={() => setRoleFilter(roleFilter === role ? "todos" : role)}
                    className={cn(
                      "flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-all active:scale-95",
                      roleFilter === role
                        ? cn(meta.color, meta.borderColor, "font-semibold")
                        : "border-border text-muted-foreground hover:text-foreground bg-secondary"
                    )}
                  >
                    {meta.label}
                    <span className="tabular-nums opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Search bar */}
          {members.length > 2 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar miembro…"
                className="w-full pl-9 pr-3 py-2 bg-secondary border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          )}
        </div>
      )}

      {/* Miembros */}
      <div className="card-premium rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between gap-3">
          <h2 className="text-sm font-black">
            Miembros actuales
            {members.length > 0 && (
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">({members.length})</span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            {/* Sort selector */}
            {!loading && members.length > 1 && (
              <div className="relative flex items-center">
                <ArrowUpDown className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                <select
                  value={memberSort}
                  onChange={(e) => setMemberSort(e.target.value as "name" | "recent")}
                  className="pl-6 pr-2 py-1 text-xs bg-secondary border-0 rounded-xl text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer appearance-none"
                >
                  <option value="recent">Más reciente</option>
                  <option value="name">A-Z</option>
                </select>
              </div>
            )}
          {!loading && members.length > 1 && (() => {
            const visibleEmails = members
              .filter((m) => {
                if (roleFilter !== "todos" && m.role !== roleFilter) return false;
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                return m.full_name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q);
              })
              .map((m) => m.email)
              .filter((e): e is string => Boolean(e));
            if (visibleEmails.length < 2) return null;
            const allCopied = copiedEmail === "__all__";
            return (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(visibleEmails.join(", ")).then(() => {
                    setCopiedEmail("__all__");
                    setTimeout(() => setCopiedEmail(null), 2000);
                  });
                }}
                title="Copiar todos los emails visibles"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-all active:scale-95 px-2 py-1 rounded-xl hover:bg-secondary"
              >
                {allCopied
                  ? <><Check className="h-3.5 w-3.5 text-green-400" /><span className="text-green-400">¡Copiado!</span></>
                  : <><Copy className="h-3.5 w-3.5" /><span>Copiar {visibleEmails.length} emails</span></>
                }
              </button>
            );
          })()}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <Mail className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Sin miembros de equipo aún</p>
          </div>
        ) : (
          (() => {
            const filtered = members
              .filter((m) => {
                if (roleFilter !== "todos" && m.role !== roleFilter) return false;
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                return m.full_name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q);
              })
              .sort((a, b) => {
                if (memberSort === "name") return (a.full_name ?? "").localeCompare(b.full_name ?? "", "es");
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              });

            if (filtered.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4 gap-2">
                  <Users className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">
                    {searchQuery.trim()
                      ? `Sin resultados para "${searchQuery}"`
                      : `Sin miembros con rol "${ROLE_META[roleFilter as UserRole]?.label ?? roleFilter}"`}
                  </p>
                  {(searchQuery.trim() || roleFilter !== "todos") && (
                    <button
                      onClick={() => { setSearchQuery(""); setRoleFilter("todos"); }}
                      className="text-xs text-primary hover:underline transition-all active:scale-95"
                    >
                      Quitar filtros
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div className="divide-y divide-border/50">
                {filtered.map((member) => {
                  const meta = ROLE_META[member.role];
                  const isCurrentUser = member.id === user?.id;
                  const isArtist = member.role === "artista";

                  return (
                    <div
                      key={member.id}
                      className="row-interactive flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/30 transition-all group"
                    >
                      {/* Avatar */}
                      {(() => {
                        const palette = getAvatarPalette(member.email ?? member.full_name ?? member.id);
                        const initials = getInitials(member.full_name, member.email);
                        return (
                          <div className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all overflow-hidden avatar-initials border",
                            member.avatar_url ? "bg-secondary border-border/50" : cn(palette.bg, palette.border),
                            "group-hover:shadow-[0_0_12px_hsl(var(--primary)/0.25)] group-hover:scale-105"
                          )}>
                            {member.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={member.avatar_url}
                                alt={member.full_name ?? ""}
                                className="w-9 h-9 rounded-full object-cover"
                              />
                            ) : (
                              <span className={cn("text-xs font-black tracking-tight", palette.text)}>
                                {initials}
                              </span>
                            )}
                          </div>
                        );
                      })()}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-black truncate group-hover:text-primary transition-colors">{member.full_name}</p>
                          {isCurrentUser && (
                            <span className="text-[10px] text-muted-foreground">(tú)</span>
                          )}
                          {isArtist && <Crown className="h-3 w-3 text-primary drop-shadow-[0_0_5px_hsl(var(--primary)/0.9)] flex-shrink-0" />}
                        </div>
                        <div className="flex items-center gap-1">
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                          {member.email && (
                            <button
                              onClick={() => handleCopyEmail(member.id, member.email!)}
                              title="Copiar email"
                              className="p-0.5 rounded-xl opacity-0 group-hover:opacity-100 hover:bg-secondary text-muted-foreground transition-all active:scale-95 flex-shrink-0"
                            >
                              {copiedEmail === member.id
                                ? <Check className="h-3 w-3 text-green-400" />
                                : <Copy className="h-3 w-3" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Selector de rol */}
                      {!isArtist && !isCurrentUser ? (
                        <div className="relative flex-shrink-0">
                          <select
                            value={member.role}
                            onChange={(e) =>
                              handleRoleChange(member, e.target.value as UserRole)
                            }
                            disabled={updatingRoleId === member.id}
                            className={cn(
                              "appearance-none pl-2 pr-6 py-1 rounded-full text-[11px] font-medium border cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed",
                              meta.color,
                              "border-transparent"
                            )}
                          >
                            <option value="productor">Productor</option>
                            <option value="manager">Manager</option>
                          </select>
                          {updatingRoleId === member.id ? (
                            <Loader2 className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin" />
                          ) : (
                            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none" />
                          )}
                        </div>
                      ) : (
                        <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-black flex-shrink-0 border", meta.color, meta.borderColor)}>
                          {meta.label}
                        </span>
                      )}

                      {/* Joined at — relative time with exact date on hover */}
                      {(() => {
                        const joined = new Date(member.created_at);
                        const diffDays = Math.floor((Date.now() - joined.getTime()) / 86_400_000);
                        const relLabel =
                          diffDays === 0 ? "hoy" :
                          diffDays === 1 ? "ayer" :
                          diffDays < 7 ? `hace ${diffDays}d` :
                          diffDays < 30 ? `hace ${Math.floor(diffDays / 7)} sem` :
                          diffDays < 365 ? `hace ${Math.floor(diffDays / 30)} mes` :
                          `hace ${Math.floor(diffDays / 365)} año${Math.floor(diffDays / 365) !== 1 ? "s" : ""}`;
                        const exactDate = joined.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
                        return (
                          <span
                            className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground/60 flex-shrink-0"
                            title={`Se unió el ${exactDate}`}
                          >
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            {relLabel}
                          </span>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            );
          })()
        )}
      </div>

      {/* Expiring invitations alert */}
      {!loading && invitations.length > 0 && (() => {
        const expiring = invitations.filter(inv => getInviteExpiry(inv.created_at).isExpiring);
        if (expiring.length === 0) return null;
        const expired = expiring.filter(inv => getInviteExpiry(inv.created_at).label === "Expirada");
        const soonCount = expiring.length - expired.length;
        const parts: string[] = [];
        if (expired.length > 0) parts.push(`${expired.length} expirada${expired.length !== 1 ? "s" : ""}`);
        if (soonCount > 0) parts.push(`${soonCount} expira${soonCount !== 1 ? "n" : ""} pronto`);
        return (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-orange-500/10 border border-orange-500/30">
            <AlertTriangle className="h-4 w-4 text-orange-400 flex-shrink-0" />
            <p className="text-sm font-medium text-orange-400">
              Invitaciones pendientes: {parts.join(" · ")} — revisá las invitaciones abajo
            </p>
          </div>
        );
      })()}

      {/* Invitaciones pendientes */}
      {invitations.length > 0 && (
        <div className="card-premium rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60">
            <h2 className="text-sm font-black">
              Invitaciones pendientes
              <span className="ml-1.5 text-xs text-muted-foreground">
                ({invitations.length})
              </span>
            </h2>
          </div>
          <div className="divide-y divide-border/50">
            {invitations.map((inv) => {
              const meta = ROLE_META[inv.role];
              const isCopiedLink = copiedLinkId === inv.id;
              const isGenerating = generatingLinkId === inv.id;
              return (
                <div key={inv.id} className="flex items-center gap-3 px-4 py-3 group">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Invitado {new Date(inv.created_at).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                  {(() => {
                    const expiry = getInviteExpiry(inv.created_at);
                    return (
                      <span className={cn(
                        "flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0",
                        expiry.isExpiring
                          ? "bg-orange-500/10 text-orange-400"
                          : "bg-secondary text-muted-foreground"
                      )}>
                        {expiry.isExpiring && <AlertTriangle className="h-2.5 w-2.5" />}
                        {expiry.label}
                      </span>
                    );
                  })()}
                  <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium flex-shrink-0", meta.color)}>
                    {meta.label}
                  </span>

                  {/* Copy invite link button */}
                  <button
                    onClick={() => handleCopyInviteLink(inv)}
                    disabled={isGenerating || isCopiedLink}
                    title={isCopiedLink ? "¡Link copiado!" : "Copiar link de invitación (72h)"}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-xl text-xs transition-all active:scale-95 flex-shrink-0",
                      isCopiedLink
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : "opacity-0 group-hover:opacity-100 hover:bg-primary/10 text-muted-foreground hover:text-primary border border-transparent hover:border-primary/20",
                      "disabled:cursor-not-allowed"
                    )}
                  >
                    {isGenerating
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : isCopiedLink
                        ? <><Check className="h-3.5 w-3.5" /><span>Copiado</span></>
                        : <><Link2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Link</span></>
                    }
                  </button>

                  <button
                    onClick={() => handleRevoke(inv)}
                    disabled={revokingId === inv.id}
                    className="p-1.5 rounded-xl hover:bg-red-500/10 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Revocar invitación"
                  >
                    {revokingId === inv.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {ConfirmDialog}

      {/* Modal invitar */}
      {showInviteForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowInviteForm(false)}
        >
          <div className="relative w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/20 via-transparent to-violet-500/10 pointer-events-none" />
            <div className="relative glass-panel rounded-2xl">
            <div className="flex items-center justify-between p-5 border-b border-border/60">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-base font-black">Invitar al equipo</h2>
              </div>
              <button onClick={() => setShowInviteForm(false)} className="p-1.5 rounded-xl hover:bg-muted/50 transition-all active:scale-95 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="p-5 space-y-4">
              {inviteErrors.root && (
                <p className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-xl">{inviteErrors.root}</p>
              )}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Email *</label>
                <input
                  ref={emailRef}
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => {
                    setInviteForm((p) => ({ ...p, email: e.target.value }));
                    setInviteErrors((p) => ({ ...p, email: undefined }));
                  }}
                  placeholder="productor@email.com"
                  className={`w-full px-3 py-2.5 bg-background border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${inviteErrors.email ? "border-red-500" : "border-border/60"}`}
                />
                {inviteErrors.email && <p className="text-xs text-red-500">{inviteErrors.email}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Rol *</label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm((p) => ({ ...p, role: e.target.value as "productor" | "manager" }))}
                  className="w-full px-3 py-2.5 bg-background border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="productor">Productor</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowInviteForm(false)} className="flex-1 py-2.5 rounded-xl border border-border/60 text-sm font-black hover:bg-secondary/60 transition-all active:scale-95">Cancelar</button>
                <button type="submit" disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-black hover:bg-primary/80 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Invitar
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
