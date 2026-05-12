"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Mail, Loader2, Lock, Eye, EyeOff, ArrowLeft, KeyRound } from "lucide-react";

type Mode = "password" | "magic" | "forgot";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage({ text: "Email o contraseña incorrectos.", error: true });
      setLoading(false);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setMessage(
      error
        ? { text: "Error al enviar el email. Intenta de nuevo.", error: true }
        : { text: "Revisá tu email para el link de acceso." }
    );
    setLoading(false);
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/perfil`,
    });
    setMessage(
      error
        ? { text: "Error al enviar el email. Intenta de nuevo.", error: true }
        : { text: "Si el email existe, vas a recibir un link para resetear tu contraseña." }
    );
    setLoading(false);
  }

  async function handleGoogleLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  function switchMode(next: Mode) {
    setMode(next);
    setMessage(null);
  }

  const handleSubmit =
    mode === "password"
      ? handlePasswordLogin
      : mode === "magic"
        ? handleMagicLink
        : handleForgotPassword;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">

      {/* ── Animated background ───────────────────────────────────────── */}
      <div className="absolute inset-0 -z-10">
        {/* Base dark gradient */}
        <div className="absolute inset-0 bg-[hsl(224_16%_5%)]" />
        {/* Primary glow top-left */}
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px] animate-pulse" style={{ animationDuration: "6s" }} />
        {/* Secondary accent top-right */}
        <div className="absolute -top-20 right-0 w-[400px] h-[400px] rounded-full bg-violet-600/8 blur-[100px]" />
        {/* Tertiary glow bottom */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-primary/6 blur-[120px]" />
        {/* Subtle grid lines */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* ── Card ─────────────────────────────────────────────────────────── */}
      <div className="w-full max-w-sm space-y-6 relative">

        {/* Logo */}
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-5">
            {/* Outer glow */}
            <div className="absolute inset-0 rounded-2xl bg-primary/25 blur-xl scale-110" />
            {/* Photo */}
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-primary/30 shadow-[0_0_40px_hsl(var(--primary)/0.35)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/artist.jpg"
                alt="BERTIAKA"
                className="w-full h-full object-cover"
                style={{ objectPosition: "50% 12%" }}
              />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight gradient-text">BERTIAKA</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium tracking-widest uppercase">Studio</p>
        </div>

        {/* Glass card */}
        <div className="bg-card/80 backdrop-blur-xl border border-border/60 rounded-2xl p-6 shadow-[0_24px_80px_hsl(0_0%_0%/0.4)] space-y-5">

          {/* ── FORGOT PASSWORD mode ── */}
          {mode === "forgot" ? (
            <>
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold">Resetear contraseña</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Ingresá tu email y te enviamos un link para elegir una nueva contraseña.
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-3">
                <LoginInput
                  icon={<Mail className="h-4 w-4" />}
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="tu@email.com"
                  autoFocus
                />
                <SubmitButton loading={loading} icon={<KeyRound className="h-4 w-4" />}>
                  Enviar link de reseteo
                </SubmitButton>
              </form>

              {message && <StatusMessage message={message} />}

              <button
                type="button"
                onClick={() => switchMode("password")}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver al inicio de sesión
              </button>
            </>
          ) : (
            /* ── LOGIN / MAGIC LINK modes ── */
            <>
              {/* Google login */}
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-white/5 border border-border/60 rounded-xl hover:bg-white/10 hover:border-border transition-all active:scale-95 text-sm font-medium"
              >
                <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continuar con Google
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border/60" />
                <span className="text-[11px] text-muted-foreground/60 font-medium">o</span>
                <div className="flex-1 h-px bg-border/60" />
              </div>

              {/* Mode toggle */}
              <div className="flex rounded-xl border border-border/60 overflow-hidden text-xs bg-background/30">
                <button
                  type="button"
                  onClick={() => switchMode("password")}
                  className={`flex-1 py-2 font-medium transition-colors ${mode === "password" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-white/5"}`}
                >
                  Contraseña
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("magic")}
                  className={`flex-1 py-2 font-medium transition-colors ${mode === "magic" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-white/5"}`}
                >
                  Link mágico
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                <LoginInput
                  icon={<Mail className="h-4 w-4" />}
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="tu@email.com"
                />

                {mode === "password" && (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type={showPwd ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 bg-background/50 border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 placeholder:text-muted-foreground/40 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                )}

                <SubmitButton loading={loading}>
                  {mode === "password" ? "Iniciar sesión" : "Enviar link de acceso"}
                </SubmitButton>
              </form>

              {/* Forgot password link */}
              {mode === "password" && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors underline underline-offset-2"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}

              {mode === "magic" && (
                <p className="text-center text-xs text-muted-foreground/50">
                  Si no tenés cuenta, se crea automáticamente.
                </p>
              )}

              {message && <StatusMessage message={message} />}
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-muted-foreground/30">
          BERTIAKA Studio · Gestión Musical Privada
        </p>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LoginInput({
  icon, type, value, onChange, placeholder, autoFocus,
}: {
  icon: React.ReactNode;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none">
        {icon}
      </span>
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full pl-10 pr-4 py-2.5 bg-background/50 border border-border/60 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 placeholder:text-muted-foreground/40 transition-all"
      />
    </div>
  );
}

function SubmitButton({
  loading, icon, children,
}: {
  loading: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="relative w-full py-2.5 rounded-xl text-sm font-semibold overflow-hidden disabled:opacity-60 transition-all active:scale-95 group"
    >
      {/* gradient background */}
      <span className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 transition-opacity group-hover:opacity-90" />
      {/* glow */}
      <span className="absolute inset-0 bg-gradient-to-r from-primary to-primary/80 blur-md opacity-40 scale-110 group-hover:opacity-60 transition-opacity" />
      <span className="relative flex items-center justify-center gap-2 text-primary-foreground">
        {loading
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : icon ?? null
        }
        {children}
      </span>
    </button>
  );
}

function StatusMessage({ message }: { message: { text: string; error?: boolean } }) {
  return (
    <p className={`text-center text-xs rounded-xl px-3 py-2 ${
      message.error
        ? "text-red-400 bg-red-500/10 border border-red-500/20"
        : "text-muted-foreground bg-primary/5 border border-primary/10"
    }`}>
      {message.text}
    </p>
  );
}
