"use client";

import { useState } from "react";
import {
  Music, ExternalLink, Clock, Play, Pause,
  Globe, Instagram, Youtube, Twitter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/utils";
import type { PublicArtistData } from "@/lib/actions/public";
import type { Song } from "@/types/database";

interface Props {
  data: PublicArtistData;
}

const PLATFORM_COLORS: Record<string, string> = {
  spotify_url:     "#1db954",
  youtube_url:     "#ef4444",
  apple_music_url: "#fa243c",
  soundcloud_url:  "#f97316",
};

const SOCIAL_ICONS: Record<string, React.ReactNode> = {
  instagram: <Instagram className="h-5 w-5" />,
  youtube:   <Youtube className="h-5 w-5" />,
  twitter:   <Twitter className="h-5 w-5" />,
  spotify:   <Music className="h-5 w-5" />,
  soundcloud:<Music className="h-5 w-5" />,
  tiktok:    <Music className="h-5 w-5" />,
};

function SongCard({ song }: { song: Song }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useState<HTMLAudioElement | null>(null)[0];
  const audioUrl = song.drive_file_id ? `/api/drive/stream/${song.drive_file_id}` : song.drive_file_url;
  const platforms = [
    { key: "spotify_url", label: "Spotify" },
    { key: "youtube_url", label: "YouTube" },
    { key: "apple_music_url", label: "Apple Music" },
    { key: "soundcloud_url", label: "SoundCloud" },
  ].filter(p => !!song[p.key as keyof Song]);

  return (
    <div className="group flex items-center gap-4 p-4 rounded-2xl border border-white/8 bg-white/4 hover:bg-white/10 hover:border-white/15 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_hsl(0_0%_0%/0.4)] transition-all duration-200 backdrop-blur-sm">
      {/* Cover */}
      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center">
        {song.cover_art_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={song.cover_art_url} alt={song.title} className="w-full h-full object-cover" />
        ) : (
          <Music className="h-6 w-6 text-white/30" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white truncate">{song.title}</p>
        <p className="text-sm text-white/60 truncate">
          {song.year}
          {song.genre ? ` · ${song.genre}` : ""}
          {song.duration_seconds ? ` · ${formatTime(song.duration_seconds)}` : ""}
        </p>
        {/* Platform links */}
        {platforms.length > 0 && (
          <div className="flex gap-2 mt-1.5">
            {platforms.map(p => (
              <a
                key={p.key}
                href={song[p.key as keyof Song] as string}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] px-2 py-0.5 rounded-full font-medium hover:opacity-80 transition-all active:scale-95"
                style={{ background: PLATFORM_COLORS[p.key] ?? "#666", color: "#fff" }}
              >
                {p.label}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Play button */}
      {audioUrl && (
        <button
          onClick={() => {
            // Simple local audio toggle (no global player on public pages)
            const audio = document.getElementById(`epk-audio-${song.id}`) as HTMLAudioElement;
            if (!audio) return;
            if (playing) { audio.pause(); setPlaying(false); }
            else { audio.play(); setPlaying(true); }
          }}
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-primary flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
        >
          {playing ? <Pause className="h-4 w-4 text-white" /> : <Play className="h-4 w-4 text-white ml-0.5" />}
        </button>
      )}
      {audioUrl && (
        <audio
          id={`epk-audio-${song.id}`}
          src={audioUrl}
          onEnded={() => setPlaying(false)}
          className="hidden"
        />
      )}
    </div>
  );
}

export default function PublicEPKClient({ data }: Props) {
  const { profile, songs, socialLinks } = data;
  const [filter, setFilter] = useState<string | null>(null);

  const genres = Array.from(new Set(songs.map(s => s.genre).filter(Boolean))) as string[];
  const filteredSongs = filter ? songs.filter(s => s.genre === filter) : songs;

  return (
    <div className="min-h-screen text-white" style={{ background: "linear-gradient(180deg, #070510 0%, #0e0a1f 30%, #0a0a14 60%, #050508 100%)" }}>
      {/* Hero */}
      <div className="relative overflow-hidden min-h-[420px] flex items-end">
        {/* Full-bleed blurred avatar as background */}
        {profile.avatar_url && (
          <>
            <div
              className="absolute inset-0 opacity-25 scale-110"
              style={{ backgroundImage: `url(${profile.avatar_url})`, backgroundSize: "cover", backgroundPosition: "center top", filter: "blur(60px) saturate(180%)" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070510] via-[#070510]/60 to-transparent" />
          </>
        )}
        {/* Decorative blobs */}
        <div className="absolute top-0 left-0 w-72 h-72 rounded-full bg-violet-600/15 blur-3xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 w-full flex flex-col items-center pb-12 pt-16 px-6 text-center">
          {/* Avatar — bigger with multi-layer glow */}
          <div className="relative mb-6">
            <div className="absolute -inset-4 rounded-full bg-violet-500/20 blur-2xl animate-pulse" style={{ animationDuration: "4s" }} />
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-violet-500/50 via-blue-500/20 to-indigo-500/30" />
            <div className="relative w-36 h-36 rounded-full overflow-hidden border-2 border-white/20 shadow-[0_0_60px_rgba(139,92,246,0.45)] bg-white/10 flex items-center justify-center">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
              ) : (
                <Music className="h-14 w-14 text-white/30" />
              )}
            </div>
          </div>

          <h1
            className="text-5xl font-black tracking-tight leading-none mb-2"
            style={{
              background: "linear-gradient(135deg, #fff 20%, #c4b5fd 60%, #93c5fd 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {profile.full_name}
          </h1>

          {profile.bio && (
            <p className="mt-3 text-white/60 max-w-md leading-relaxed text-sm">{profile.bio}</p>
          )}

          {/* Stats pills */}
          <div className="flex items-center gap-3 mt-5 flex-wrap justify-center">
            <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-white/8 border border-white/10 backdrop-blur-sm">
              <strong className="text-white">{songs.length}</strong>
              <span className="text-white/50">canciones</span>
            </span>
            {songs.some(s => s.spotify_url) && (
              <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-green-500/15 border border-green-500/20 text-green-300">
                <Globe className="h-3 w-3" /> En plataformas
              </span>
            )}
          </div>

          {/* Social links */}
          {socialLinks.length > 0 && (
            <div className="flex items-center gap-2 mt-5">
              {socialLinks.map(s => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-11 h-11 rounded-full bg-white/8 hover:bg-white/16 border border-white/10 flex items-center justify-center transition-all hover:scale-110 hover:-translate-y-0.5 active:scale-95"
                  title={s.platform}
                >
                  {SOCIAL_ICONS[s.platform] ?? <ExternalLink className="h-4 w-4" />}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Catalog */}
      <div className="max-w-2xl mx-auto px-4 pb-20 space-y-6">
        {/* Genre filter */}
        {genres.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter(null)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border",
                !filter
                  ? "bg-white text-black border-white shadow-[0_0_16px_rgba(255,255,255,0.3)]"
                  : "bg-white/8 text-white/60 border-white/10 hover:bg-white/15 hover:text-white"
              )}
            >
              Todo
            </button>
            {genres.map(g => (
              <button
                key={g}
                onClick={() => setFilter(g === filter ? null : g)}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border",
                  filter === g
                    ? "bg-violet-500 text-white border-violet-400 shadow-[0_0_16px_rgba(139,92,246,0.5)]"
                    : "bg-white/8 text-white/60 border-white/10 hover:bg-white/15 hover:text-white"
                )}
              >
                {g}
              </button>
            ))}
          </div>
        )}

        {filteredSongs.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-white/30 gap-3">
            <Music className="h-12 w-12" />
            <p>Sin canciones públicas</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSongs.map(song => (
              <SongCard key={song.id} song={song} />
            ))}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-white/15 text-[11px] uppercase tracking-[0.2em] font-medium pt-6 pb-4">
          ✦ Estudio Digital
        </p>
      </div>
    </div>
  );
}
