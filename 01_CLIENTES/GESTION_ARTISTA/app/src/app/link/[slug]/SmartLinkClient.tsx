"use client";

/**
 * SmartLinkClient — Página de bio-link estilo Linktree para músicos
 * Accesible en /link/[slug] sin autenticación
 */

import { Music, ExternalLink, Instagram, Youtube, Twitter, Globe, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PublicArtistData } from "@/lib/actions/public";
import type { Song, SocialLink } from "@/types/database";

interface Props {
  data: PublicArtistData;
}

const PLATFORM_META: Record<string, { label: string; color: string; emoji: string }> = {
  spotify:    { label: "Escuchar en Spotify",    color: "#1db954", emoji: "🎵" },
  youtube:    { label: "Ver en YouTube",          color: "#ef4444", emoji: "▶️" },
  instagram:  { label: "Instagram",               color: "#e1306c", emoji: "📸" },
  tiktok:     { label: "TikTok",                  color: "#010101", emoji: "🎶" },
  soundcloud: { label: "SoundCloud",              color: "#f97316", emoji: "🔊" },
  twitter:    { label: "X / Twitter",             color: "#1da1f2", emoji: "🐦" },
};

function SocialButton({ link }: { link: SocialLink }) {
  const meta = PLATFORM_META[link.platform];
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-medium text-white transition-all duration-200",
        "hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
      )}
      style={{ background: meta?.color ?? "#333" }}
    >
      <span className="text-xl w-8 text-center">{meta?.emoji ?? "🔗"}</span>
      <span className="flex-1 text-center text-sm font-semibold">
        {link.username ? `@${link.username}` : (meta?.label ?? link.platform)}
      </span>
      <ExternalLink className="h-4 w-4 opacity-60 flex-shrink-0" />
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
      className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 transition-all duration-200 hover:scale-[1.01]"
    >
      {/* Mini cover */}
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center flex-shrink-0">
        {song.cover_art_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={song.cover_art_url} alt={song.title} className="w-full h-full object-cover" />
        ) : (
          <Music className="h-5 w-5 text-white/30" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{song.title}</p>
        <p className="text-xs text-white/50">{song.year}</p>
      </div>
      <Play className="h-4 w-4 text-white/40 flex-shrink-0" />
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
      className="min-h-screen flex flex-col items-center justify-start px-4 py-12"
      style={{
        background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
      }}
    >
      <div className="w-full max-w-sm space-y-6">
        {/* Avatar + name */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 shadow-2xl bg-white/10 flex items-center justify-center">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
            ) : (
              <Music className="h-10 w-10 text-white/30" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{profile.full_name}</h1>
            {profile.bio && (
              <p className="text-sm text-white/60 mt-1 max-w-[260px] leading-relaxed">{profile.bio}</p>
            )}
          </div>
        </div>

        {/* EPK link */}
        <a
          href={`/p/${profile.artist_slug}`}
          className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] bg-gradient-to-r from-violet-600 to-indigo-600"
        >
          <span className="text-xl w-8 text-center">🎤</span>
          <span className="flex-1 text-center text-sm font-semibold">Ver EPK completo</span>
          <ExternalLink className="h-4 w-4 opacity-60 flex-shrink-0" />
        </a>

        {/* Social buttons */}
        {socialLinks.length > 0 && (
          <div className="space-y-3">
            {socialLinks.map(link => (
              <SocialButton key={link.id} link={link} />
            ))}
          </div>
        )}

        {/* Featured songs */}
        {featuredSongs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-white/40 uppercase tracking-wider font-medium text-center">Escuchar</p>
            {featuredSongs.map(song => (
              <SongPill key={song.id} song={song} />
            ))}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-white/20 text-xs">
          Powered by Estudio Digital
        </p>
      </div>
    </div>
  );
}
