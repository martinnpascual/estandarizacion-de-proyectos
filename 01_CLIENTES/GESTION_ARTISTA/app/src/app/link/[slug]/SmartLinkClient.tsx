"use client";

/**
 * SmartLinkClient — Página de bio-link estilo Linktree para músicos
 * Accesible en /link/[slug] sin autenticación
 */

import { Music, ExternalLink, Instagram, Youtube, Twitter, Globe, Play, Disc3 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicArtistData } from "@/lib/actions/public";
import type { Song, SocialLink } from "@/types/database";

interface Props {
  data: PublicArtistData;
}

const PLATFORM_META: Record<string, { label: string; color: string; gradient: string; emoji: string }> = {
  spotify:    { label: "Escuchar en Spotify",    color: "#1db954", gradient: "linear-gradient(135deg,#1db954,#158f3e)", emoji: "🎵" },
  youtube:    { label: "Ver en YouTube",          color: "#ef4444", gradient: "linear-gradient(135deg,#ef4444,#b91c1c)", emoji: "▶️" },
  instagram:  { label: "Instagram",               color: "#e1306c", gradient: "linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)", emoji: "📸" },
  tiktok:     { label: "TikTok",                  color: "#010101", gradient: "linear-gradient(135deg,#010101,#333)", emoji: "🎶" },
  soundcloud: { label: "SoundCloud",              color: "#f97316", gradient: "linear-gradient(135deg,#f97316,#c2410c)", emoji: "🔊" },
  twitter:    { label: "X / Twitter",             color: "#1da1f2", gradient: "linear-gradient(135deg,#1da1f2,#0369a1)", emoji: "🐦" },
};

function SocialButton({ link }: { link: SocialLink }) {
  const meta = PLATFORM_META[link.platform];
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-medium text-white transition-all duration-300",
        "hover:scale-[1.03] hover:-translate-y-0.5 active:scale-[0.97]",
        "relative overflow-hidden group"
      )}
      style={{ background: meta?.gradient ?? meta?.color ?? "#333" }}
    >
      {/* Inset highlight */}
      <span className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
      {/* Hover glow */}
      <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ boxShadow: `0 0 40px ${meta?.color ?? "#666"}60` }} />
      <span className="relative text-xl w-8 text-center">{meta?.emoji ?? "🔗"}</span>
      <span className="relative flex-1 text-center text-sm font-bold tracking-wide">
        {link.username ? `@${link.username}` : (meta?.label ?? link.platform)}
      </span>
      <ExternalLink className="relative h-4 w-4 opacity-50 flex-shrink-0" />
    </a>
  );
}

function SongPill({ song }: { song: Song }) {
  const firstPlatform = (
    ["spotify_url", "youtube_url", "soundcloud_url", "apple_music_url"] as (keyof Song)[]
  ).find(k => !!song[k]);
  const url = firstPlatform ? (song[firstPlatform] as string) : null;

  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/8 hover:bg-white/14 border border-white/10 hover:border-white/20 transition-all duration-200 hover:scale-[1.01] hover:-translate-y-0.5 backdrop-blur-sm"
    >
      {/* Mini cover */}
      <div className="w-11 h-11 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center flex-shrink-0 shadow-lg">
        {song.cover_art_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={song.cover_art_url} alt={song.title} className="w-full h-full object-cover" />
        ) : (
          <Music className="h-5 w-5 text-white/30" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{song.title}</p>
        <p className="text-xs text-white/50">{song.year}{song.genre ? ` · ${song.genre}` : ""}</p>
      </div>
      <div className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-white/20 flex items-center justify-center transition-all flex-shrink-0">
        <Play className="h-3.5 w-3.5 text-white/70 ml-0.5" />
      </div>
    </a>
  );
}

export default function SmartLinkClient({ data }: Props) {
  const { profile, songs, socialLinks } = data;

  // Recent songs (last 5) that have at least one streaming platform
  const featuredSongs = songs
    .filter(s => s.spotify_url || s.youtube_url || s.soundcloud_url || s.apple_music_url)
    .slice(0, 5);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start px-4 py-12 relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0a0718 0%, #120b2e 40%, #0f1629 70%, #0a0a14 100%)" }}
    >
      {/* ── Animated background blobs ─────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-violet-600/15 blur-[120px] animate-pulse" style={{ animationDuration: "6s" }} />
        <div className="absolute top-1/3 -right-20 w-[350px] h-[350px] rounded-full bg-blue-600/12 blur-[100px] animate-pulse" style={{ animationDuration: "9s", animationDelay: "2s" }} />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[500px] h-[250px] rounded-full bg-indigo-600/10 blur-[120px]" />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: "linear-gradient(rgba(139,92,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,1) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }} />
        {/* Floating waveform bars */}
        <div className="absolute bottom-6 left-4 flex items-end gap-0.5 opacity-[0.07]">
          {[12, 22, 16, 30, 20, 26, 14, 32, 18, 24].map((h, i) => (
            <div key={i} className="w-1 rounded-full bg-violet-400 animate-pulse"
              style={{ height: h, animationDelay: `${i * 0.18}s`, animationDuration: "1.6s" }} />
          ))}
        </div>
        <div className="absolute top-6 right-4 flex items-end gap-0.5 opacity-[0.05] rotate-180">
          {[18, 28, 12, 24, 16, 20, 30, 14, 22, 18].map((h, i) => (
            <div key={i} className="w-1 rounded-full bg-blue-400 animate-pulse"
              style={{ height: h, animationDelay: `${i * 0.14}s`, animationDuration: "2s" }} />
          ))}
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="relative w-full max-w-sm space-y-6 z-10">

        {/* Avatar + name */}
        <div className="flex flex-col items-center text-center gap-4">
          <div className="relative">
            {/* Outer glow rings */}
            <div className="absolute -inset-3 rounded-full bg-violet-500/20 blur-xl animate-pulse" style={{ animationDuration: "3s" }} />
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-violet-500/40 via-blue-500/20 to-indigo-500/30 animate-pulse" style={{ animationDuration: "5s" }} />
            {/* Avatar */}
            <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-white/20 shadow-[0_0_40px_rgba(139,92,246,0.4)] bg-white/10 flex items-center justify-center">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
              ) : (
                <Disc3 className="h-12 w-12 text-white/30" />
              )}
            </div>
            {/* Status dot */}
            <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-[#0a0718] shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
          </div>

          <div>
            <h1
              className="text-3xl font-black tracking-tight"
              style={{
                background: "linear-gradient(135deg, #fff 30%, #a78bfa 70%, #60a5fa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {profile.full_name}
            </h1>
            {profile.bio && (
              <p className="text-sm text-white/55 mt-2 max-w-[280px] leading-relaxed">{profile.bio}</p>
            )}
          </div>
        </div>

        {/* EPK link — featured button */}
        <a
          href={`/p/${profile.artist_slug}`}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-medium text-white transition-all duration-300 hover:scale-[1.03] hover:-translate-y-1 active:scale-[0.97] relative overflow-hidden group"
          style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
        >
          <span className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />
          <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ boxShadow: "0 0 40px rgba(124,58,237,0.5)" }} />
          <span className="relative text-xl w-8 text-center">🎤</span>
          <span className="relative flex-1 text-center text-sm font-bold tracking-wide">Ver EPK completo</span>
          <ExternalLink className="relative h-4 w-4 opacity-50 flex-shrink-0" />
        </a>

        {/* Social buttons */}
        {socialLinks.length > 0 && (
          <div className="space-y-3">
            <p className="text-[10px] text-white/30 uppercase tracking-[0.18em] font-bold text-center">Seguir</p>
            {socialLinks.map(link => (
              <SocialButton key={link.id} link={link} />
            ))}
          </div>
        )}

        {/* Featured songs */}
        {featuredSongs.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] text-white/30 uppercase tracking-[0.18em] font-bold text-center">Escuchar</p>
            {featuredSongs.map(song => (
              <SongPill key={song.id} song={song} />
            ))}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-white/15 text-[11px] tracking-widest uppercase font-medium pb-4">
          ✦ Estudio Digital
        </p>
      </div>
    </div>
  );
}
