"use client";

import { useState, useEffect } from "react";
import {
  User,
  Mail,
  Shield,
  Link2,
  Link2Off,
  Save,
  Camera,
  Keyboard,
  Sun,
  Moon,
  Disc3,
  FileAudio,
  Users,
  FolderOpen,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ChevronRight,
  CheckCircle2,
  CalendarDays,
  Activity,
  Globe,
} from "lucide-react";
import { getProfile, updateProfile, disconnectGoogle } from "@/lib/actions/profile";
import { getDashboardStats, getRecentActivity } from "@/lib/actions/dashboard";
import { createClient } from "@/lib/supabase/client";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { useTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/utils";
import type { Profile, UserRole } from "@/types/database";
import type { DashboardStats, ActivityItem } from "@/lib/actions/dashboard";

function getPasswordStrength(pwd: string): { score: number; label: string; color: string; barColor: string } {
  if (!pwd) return { score: 0, label: "", color: "", barColor: "" };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^a-zA-Z0-9]/.test(pwd)) score++;
  if (score <= 1) return { score, label: "Muy débil", color: "text-red-400", barColor: "bg-red-500" };
  if (score === 2) return { score, label: "Débil", color: "text-orange-400", barColor: "bg-orange-500" };
  if (score === 3) return { score, label: "Aceptable", color: "text-yellow-400", barColor: "bg-yellow-500" };
  if (score === 4) return { score, label: "Buena", color: "text-blue-400", barColor: "bg-blue-500" };
  return { score, label: "Fuerte", color: "text-green-400", barColor: "bg-green-500" };
}

const ROLE_LABELS: Record<UserRole, string> = {
  artista: "Artista",
  productor: "Productor",
  manager: "Manager",
};

const ROLE_COLORS: Record<UserRole, string> = {
  artista: "bg-primary/10 text-primary",
  productor: "bg-blue-500/10 text-blue-400",
  manager: "bg-yellow-500/10 text-yellow-400",
};

export default function PerfilPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const toast = useToast();
  const { theme, toggle: toggleTheme } = useTheme();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [artistSlug, setArtistSlug] = useState("");
  const [bio, setBio] = useState("");

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    Promise.allSettled([
      getProfile(),
      getDashboardStats(),
      getRecentActivity(8),
    ]).then(([profileSettled, statsSettled, activitySettled]) => {
      if (profileSettled.status === "fulfilled" && profileSettled.value.data) {
        const p = profileSettled.value.data;
        setProfile(p);
        setFullName(p.full_name ?? "");
        setAvatarUrl(p.avatar_url ?? "");
        setArtistSlug(p.artist_slug ?? "");
        setBio(p.bio ?? "");
      }
      if (statsSettled.status === "fulfilled" && statsSettled.value.data) {
        setStats(statsSettled.value.data);
      }
      if (activitySettled.status === "fulfilled" && activitySettled.value.data) {
        setRecentActivity(activitySettled.value.data);
      }
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { data, error } = await updateProfile({
      full_name: fullName,
      avatar_url: avatarUrl || null,
      artist_slug: artistSlug.trim() || null,
      bio: bio.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error);
    } else {
      setProfile(data);
      toast.success("Perfil actualizado correctamente");
    }
  }

  async function handleDisconnectGoogle() {
    if (!await confirm({ title: "¿Desconectar Google?", message: "Se eliminarán los tokens de acceso a Drive y Calendar. Podrás volver a conectarlo en cualquier momento.", confirmLabel: "Desconectar", variant: "default" })) return;
    setDisconnecting(true);
    const { error } = await disconnectGoogle();
    setDisconnecting(false);
    if (error) {
      toast.error(error);
    } else {
      setProfile((p) =>
        p
          ? {
              ...p,
              google_access_token: null,
              google_refresh_token: null,
              google_token_expiry: null,
            }
          : p
      );
      toast.success("Google desconectado correctamente");
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden");
      return;
    }
    setSavingPassword(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      setPasswordError(error.message);
    } else {
      toast.success("Contraseña actualizada correctamente");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  const googleLinked = !!profile?.google_refresh_token;

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="h-8 bg-secondary rounded w-48 animate-pulse" />
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 bg-secondary rounded w-24 animate-pulse" />
              <div className="h-10 bg-secondary rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Mi perfil</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Administra tu información personal
        </p>
      </div>

      {/* Avatar preview */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-border"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/20 border-2 border-border flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center">
              <Camera className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
          <div>
            <p className="font-semibold text-lg">{profile?.full_name || "—"}</p>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            {profile?.role && (
              <span
                className={cn(
                  "inline-block mt-1.5 text-xs px-2.5 py-0.5 rounded-full font-medium",
                  ROLE_COLORS[profile.role]
                )}
              >
                {ROLE_LABELS[profile.role]}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Edit form */}
      <form
        onSubmit={handleSave}
        className="bg-card border border-border rounded-xl p-6 space-y-5"
      >
        <h2 className="font-semibold flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          Información personal
        </h2>

        {/* Full name */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium">
            Nombre completo
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Tu nombre artístico o real"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            required
          />
        </div>

        {/* Email (read-only) */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <Mail className="h-3 w-3" />
            Email
          </label>
          <input
            type="email"
            value={profile?.email ?? ""}
            disabled
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
          />
          <p className="text-[11px] text-muted-foreground">
            El email no puede modificarse desde aquí
          </p>
        </div>

        {/* Avatar URL */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium">
            URL de avatar (opcional)
          </label>
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium">
            Bio pública (opcional)
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Breve descripción del artista para tu EPK público…"
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          />
          <p className="text-[11px] text-muted-foreground">{bio.length}/300 caracteres</p>
        </div>

        {/* EPK Slug */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <Globe className="h-3 w-3" />
            Slug de artista (EPK público)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground bg-secondary px-2.5 py-2 rounded-l-lg border border-border border-r-0 flex-shrink-0">
              /p/
            </span>
            <input
              type="text"
              value={artistSlug}
              onChange={(e) => setArtistSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              placeholder="nombre-artista"
              maxLength={50}
              className="flex-1 bg-background border border-border rounded-r-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          {artistSlug && (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[11px] text-muted-foreground">
                Tu EPK estará en:{" "}
                <a
                  href={`/p/${artistSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {typeof window !== "undefined" ? `${window.location.origin}/p/${artistSlug}` : `/p/${artistSlug}`}
                </a>
              </p>
              <a
                href={`/link/${artistSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-primary hover:underline"
              >
                (Smart Link)
              </a>
            </div>
          )}
        </div>

        {/* Role (read-only) */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Rol
          </label>
          <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg border border-border">
            {profile?.role && (
              <span
                className={cn(
                  "text-xs px-2 py-0.5 rounded-full font-medium",
                  ROLE_COLORS[profile.role]
                )}
              >
                {ROLE_LABELS[profile.role]}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              El rol lo asigna el administrador
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/80 transition-colors disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>

      {/* Google integration */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2 text-sm">
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Google Drive & Calendar
        </h2>

        {googleLinked ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-green-400">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              Cuenta conectada correctamente
            </div>
            <p className="text-xs text-muted-foreground">
              Puedes vincular archivos de audio desde Google Drive y sincronizar
              eventos con Google Calendar.
            </p>
            <button
              onClick={handleDisconnectGoogle}
              disabled={disconnecting}
              className="flex items-center gap-2 text-xs px-3 py-1.5 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              <Link2Off className="h-3.5 w-3.5" />
              {disconnecting ? "Desconectando…" : "Desconectar Google"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-muted-foreground" />
              No conectado
            </div>
            <p className="text-xs text-muted-foreground">
              Conecta tu cuenta de Google para acceder a archivos de Drive y
              sincronizar el calendario.
            </p>
            <a
              href="/api/auth/google"
              className="flex items-center gap-2 text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/80 transition-colors w-fit"
            >
              <Link2 className="h-3.5 w-3.5" />
              Conectar Google
            </a>
          </div>
        )}
      </div>

      {/* Password change */}
      <form onSubmit={handleChangePassword} className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2 text-sm">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          Cambiar contraseña
        </h2>

        {passwordError && (
          <p className="text-sm text-red-500 bg-red-500/10 px-3 py-2 rounded-lg">{passwordError}</p>
        )}

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Nueva contraseña
          </label>
          <div className="relative">
            <input
              type={showNewPwd ? "text" : "password"}
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPasswordError(null); }}
              placeholder="Mínimo 8 caracteres"
              className="w-full bg-background border border-border rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              type="button"
              onClick={() => setShowNewPwd((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {newPassword && (() => {
            const strength = getPasswordStrength(newPassword);
            return (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-colors",
                        i < strength.score ? strength.barColor : "bg-secondary"
                      )}
                    />
                  ))}
                </div>
                <p className={cn("text-[11px]", strength.color)}>{strength.label}</p>
              </div>
            );
          })()}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
            <Lock className="h-3 w-3" />
            Confirmar contraseña
          </label>
          <div className="relative">
            <input
              type={showConfirmPwd ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(null); }}
              placeholder="Repetí la contraseña"
              className="w-full bg-background border border-border rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPwd((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showConfirmPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="text-[11px] text-red-400">Las contraseñas no coinciden</p>
          )}
          {newPassword && confirmPassword && newPassword === confirmPassword && (
            <p className="text-[11px] text-green-400">✓ Las contraseñas coinciden</p>
          )}
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={savingPassword || !newPassword || !confirmPassword}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/80 transition-colors disabled:opacity-50"
          >
            <Lock className="h-4 w-4" />
            {savingPassword ? "Guardando…" : "Actualizar contraseña"}
          </button>
        </div>
      </form>

      {/* Keyboard shortcuts */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2 text-sm">
          <Keyboard className="h-4 w-4 text-muted-foreground" />
          Atajos de teclado
        </h2>
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5">
          {[
            { keys: ["⌘", "K"],          desc: "Abrir búsqueda rápida" },
            { keys: ["?"],               desc: "Mostrar / ocultar panel de atajos" },
            { keys: ["N"],               desc: "Nuevo item (en páginas de lista)" },
            { keys: ["/"],               desc: "Enfocar búsqueda (en páginas de lista)" },
            { keys: ["V"],               desc: "Alternar vista (lista / tablero / cuadrícula)" },
            { keys: ["E"],               desc: "Exportar CSV (listas) · Exportar .ics (calendario)" },
            { keys: ["P"],               desc: "Reproducir / pausar (panel detalle de canción)" },
            { keys: ["B"],               desc: "Registrar estadísticas hoy (redes)" },
            { keys: ["R"],               desc: "Actualizar notificaciones" },
            { keys: ["↑", "↓"],          desc: "Navegar entre canciones (discografía)" },
            { keys: ["Enter"],           desc: "Reproducir / abrir detalle (canción seleccionada)" },
            { keys: ["Espacio"],         desc: "Play / Pause (player activo)" },
            { keys: ["←", "→"],          desc: "Retroceder / adelantar 10s · Mes anterior/siguiente" },
            { keys: ["1–6"],             desc: "Cambiar pestaña (estadísticas)" },
            { keys: ["C"],               desc: "Vista mensual (calendario)" },
            { keys: ["A"],               desc: "Vista agenda (calendario)" },
            { keys: ["Y"],               desc: "Vista anual (calendario)" },
            { keys: ["T"],               desc: "Ir al mes actual (calendario)" },
            { keys: ["Alt", "←"],        desc: "Pista anterior" },
            { keys: ["Alt", "→"],        desc: "Pista siguiente" },
            { keys: ["Alt", "Q"],        desc: "Abrir cola de reproducción" },
            { keys: ["M"],               desc: "Silenciar / activar audio" },
            { keys: ["Esc"],             desc: "Cerrar modales / paneles" },
          ].map(({ keys, desc }) => (
            <div key={desc} className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">{desc}</span>
              <div className="flex items-center gap-1 flex-shrink-0">
                {keys.map((k, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span className="text-[10px] text-muted-foreground/50">+</span>}
                    <kbd className="text-[10px] bg-secondary border border-border px-1.5 py-0.5 rounded font-mono leading-none">
                      {k}
                    </kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Theme */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2 text-sm">
          {theme === "dark" ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-muted-foreground" />}
          Apariencia
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{theme === "dark" ? "Modo oscuro" : "Modo claro"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Cambia el tema de la interfaz</p>
          </div>
          <button
            onClick={toggleTheme}
            className={cn(
              "relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50",
              theme === "dark" ? "bg-primary" : "bg-secondary border border-border"
            )}
            aria-label="Cambiar tema"
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 flex items-center justify-center",
                theme === "dark" ? "translate-x-5" : "translate-x-0"
              )}
            >
              {theme === "dark"
                ? <Moon className="h-2.5 w-2.5 text-primary" />
                : <Sun className="h-2.5 w-2.5 text-yellow-500" />}
            </span>
          </button>
        </div>
      </div>

      {/* Quick stats */}
      {stats && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground">Resumen del catálogo</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Disc3,         label: "Canciones",          value: stats.totalSongs,       color: "text-primary",     href: "/discografia" },
              { icon: FileAudio,     label: "Maquetas activas",   value: stats.activeDrafts,     color: "text-blue-400",    href: "/maquetas" },
              { icon: CheckCircle2,  label: "Listas p/publicar",  value: stats.readyToPublish,   color: "text-green-400",   href: "/maquetas" },
              { icon: Users,         label: "Featurings",         value: stats.pendingCollabs,   color: "text-yellow-400",  href: "/collabs" },
              { icon: FolderOpen,    label: "Proyectos activos",  value: stats.activeProjects,   color: "text-purple-400",  href: "/proyectos" },
              { icon: CalendarDays,  label: "Eventos este mes",   value: stats.eventsThisMonth,  color: "text-cyan-400",    href: "/calendario" },
            ].map(({ icon: Icon, label, value, color, href }) => (
              <a
                key={label}
                href={href}
                className="flex flex-col gap-2 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors group"
              >
                <Icon className={cn("h-4 w-4 flex-shrink-0", color)} />
                <div className="min-w-0">
                  <p className="text-xl font-bold tabular-nums leading-none">{value}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{label}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      {recentActivity.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Actividad reciente
          </h2>
          <div className="space-y-1">
            {recentActivity.map((item) => {
              const ICON_MAP: Record<ActivityItem["type"], React.ElementType> = {
                song: Disc3, draft: FileAudio, collab: Users, project: FolderOpen,
              };
              const COLOR_MAP: Record<ActivityItem["type"], string> = {
                song: "text-primary", draft: "text-blue-400", collab: "text-yellow-400", project: "text-purple-400",
              };
              const BG_MAP: Record<ActivityItem["type"], string> = {
                song: "bg-primary/10", draft: "bg-blue-400/10", collab: "bg-yellow-400/10", project: "bg-purple-400/10",
              };
              const Icon = ICON_MAP[item.type];
              const diff = Date.now() - new Date(item.ts).getTime();
              const days = Math.floor(diff / 86_400_000);
              const timeAgoStr = days === 0 ? "Hoy" : days === 1 ? "Ayer" : days < 7 ? `Hace ${days}d` : days < 30 ? `Hace ${Math.round(days / 7)}sem` : `Hace ${Math.round(days / 30)}mes`;

              return (
                <a
                  key={`${item.id}-${item.action}`}
                  href={item.href}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-secondary transition-colors group"
                >
                  <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0", BG_MAP[item.type])}>
                    <Icon className={cn("h-3.5 w-3.5", COLOR_MAP[item.type])} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate leading-snug">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0 tabular-nums">{timeAgoStr}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </a>
              );
            })}
          </div>
        </div>
      )}

      {ConfirmDialog}

      {/* Account info */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-3">
        <h2 className="font-semibold text-sm text-muted-foreground">
          Información de cuenta
        </h2>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-muted-foreground mb-0.5">Miembro desde</p>
            <p className="font-medium">
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString("es-AR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground mb-0.5">Última actualización</p>
            <p className="font-medium">
              {profile?.updated_at
                ? new Date(profile.updated_at).toLocaleDateString("es-AR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
