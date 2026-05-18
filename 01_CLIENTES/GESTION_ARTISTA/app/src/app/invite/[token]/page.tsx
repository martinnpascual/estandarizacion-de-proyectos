/**
 * /invite/[token] — Public invite acceptance page
 *
 * Anyone with the link can land here. Shows who invited them + their role,
 * then redirects to /auth/login with the email pre-filled.
 * The existing /auth/callback automatically accepts the invitation after login.
 */

import { getInviteByToken } from "@/lib/actions/team";
import { redirect } from "next/navigation";

const ROLE_LABELS: Record<string, string> = {
  productor: "Productor",
  manager: "Manager",
  artista: "Artista",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  productor: "Podés ver y subir audio, dejar comentarios con timestamps y ver el calendario.",
  manager: "Podés ver todo, gestionar el calendario y ver las estadísticas de redes.",
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;

  const { data, error } = await getInviteByToken(token);

  // ── Invalid / already accepted / revoked ──────────────────────────────────
  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-black">Invitación no válida</h1>
          <p className="text-sm text-muted-foreground">
            {error ?? "Esta invitación no existe, ya fue aceptada o fue revocada."}
          </p>
          <a
            href="/auth/login"
            className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-black hover:bg-primary/90 transition-all"
          >
            Ir al inicio de sesión
          </a>
        </div>
      </div>
    );
  }

  // ── Expired ────────────────────────────────────────────────────────────────
  if (data.is_expired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-black">Invitación expirada</h1>
          <p className="text-sm text-muted-foreground">
            Este link venció (72 horas). Pedile al artista que genere un nuevo link.
          </p>
          <a
            href="/auth/login"
            className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-black hover:bg-primary/90 transition-all"
          >
            Ir al inicio de sesión
          </a>
        </div>
      </div>
    );
  }

  // ── Valid invitation ───────────────────────────────────────────────────────
  const roleLabel = ROLE_LABELS[data.role] ?? data.role;
  const roleDesc = ROLE_DESCRIPTIONS[data.role];

  // Calculate hours left
  let hoursLeft: number | null = null;
  if (data.expires_at) {
    hoursLeft = Math.max(
      0,
      Math.ceil((new Date(data.expires_at).getTime() - Date.now()) / 3_600_000)
    );
  }

  // Build the login URL with email pre-filled so the user doesn't have to type it
  const loginUrl = `/auth/login?email=${encodeURIComponent(data.email)}`;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Subtle background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/8 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Card border glow */}
        <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-primary/20 via-transparent to-violet-500/10 pointer-events-none" />

        <div className="relative glass-panel rounded-2xl p-7 space-y-6">
          {/* Branding */}
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-3">
              Invitación al estudio
            </p>
            <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-black gradient-text">Fuiste invitado al equipo</h1>
          </div>

          {/* Invitation details */}
          <div className="space-y-3">
            <div className="bg-secondary/60 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Email</span>
                <span className="text-sm font-medium truncate max-w-[180px]">{data.email}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">Rol asignado</span>
                <span className="text-sm font-black text-primary">{roleLabel}</span>
              </div>
              {hoursLeft !== null && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Válida por</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {hoursLeft >= 24
                      ? `${Math.floor(hoursLeft / 24)}d ${hoursLeft % 24}h`
                      : `${hoursLeft}h`}
                  </span>
                </div>
              )}
            </div>
            {roleDesc && (
              <p className="text-xs text-muted-foreground px-1">{roleDesc}</p>
            )}
          </div>

          {/* CTA */}
          <div className="space-y-3">
            <a
              href={loginUrl}
              className="btn-shine flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-black hover:bg-primary/90 hover:scale-[1.02] transition-all active:scale-95 shadow-[0_0_20px_hsl(var(--primary)/0.35)]"
            >
              Aceptar invitación
            </a>
            <p className="text-[11px] text-muted-foreground text-center">
              Serás redirigido al inicio de sesión con tu email ya cargado.
              Si no tenés cuenta, creá una con ese mismo email.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
