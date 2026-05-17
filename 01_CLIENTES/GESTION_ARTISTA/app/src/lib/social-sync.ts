/**
 * Social platform stat fetching logic.
 * Used by both the Vercel cron route and the manual Server Action.
 *
 * Supported platforms (public API, no user OAuth needed):
 *   - YouTube  → YouTube Data API v3 (env: YOUTUBE_API_KEY)
 *   - Spotify  → Client Credentials flow (env: SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET)
 *
 * Not supported (require user OAuth or paid tier):
 *   - Instagram, TikTok, SoundCloud, Twitter/X
 */

export interface PlatformSyncResult {
  platform: string;
  followers: number | null;
  monthly_plays: number | null;
  error?: string;
}

/** Platforms that have working public API access. */
export const AUTO_SYNC_PLATFORMS = ["youtube", "spotify"] as const;
export type AutoSyncPlatform = (typeof AUTO_SYNC_PLATFORMS)[number];

export function supportsAutoSync(platform: string): platform is AutoSyncPlatform {
  return (AUTO_SYNC_PLATFORMS as readonly string[]).includes(platform);
}

// ─── YouTube ─────────────────────────────────────────────────────────────────

function extractYouTubeIdentifier(
  url: string
): { type: "handle" | "channelId"; value: string } | null {
  // Modern @handle format: youtube.com/@BertiAKA
  const handleMatch = url.match(/youtube\.com\/@([a-zA-Z0-9._-]+)/);
  if (handleMatch) return { type: "handle", value: `@${handleMatch[1]}` };

  // Direct channel ID: youtube.com/channel/UCxxxxxx
  const channelMatch = url.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)/);
  if (channelMatch) return { type: "channelId", value: channelMatch[1] };

  // Legacy /c/ or /user/ — treat as handle (YouTube API will resolve)
  const legacyMatch = url.match(/youtube\.com\/(?:c|user)\/([a-zA-Z0-9._-]+)/);
  if (legacyMatch) return { type: "handle", value: legacyMatch[1] };

  return null;
}

async function fetchYouTubeStats(url: string): Promise<PlatformSyncResult> {
  const base: PlatformSyncResult = { platform: "youtube", followers: null, monthly_plays: null };

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return { ...base, error: "YOUTUBE_API_KEY no configurada" };

  const id = extractYouTubeIdentifier(url);
  if (!id) return { ...base, error: "No se pudo extraer el identificador de la URL de YouTube" };

  const params = new URLSearchParams({ part: "statistics", key: apiKey });
  if (id.type === "handle") params.set("forHandle", id.value);
  else params.set("id", id.value);

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?${params}`,
      { next: { revalidate: 0 } }
    );
    if (!res.ok) {
      const body = await res.text();
      return { ...base, error: `YouTube API ${res.status}: ${body.slice(0, 120)}` };
    }

    const data = await res.json();
    const channel = data.items?.[0];
    if (!channel) return { ...base, error: "Canal no encontrado" };

    const raw = channel.statistics?.subscriberCount;
    const followers = raw != null ? parseInt(raw, 10) : null;
    // Monthly views not available in free API tier — we skip monthly_plays
    return { ...base, followers };
  } catch (err) {
    return { ...base, error: err instanceof Error ? err.message : "Error de red" };
  }
}

// ─── Spotify ─────────────────────────────────────────────────────────────────

async function getSpotifyAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.access_token as string) ?? null;
  } catch {
    return null;
  }
}

async function fetchSpotifyStats(url: string): Promise<PlatformSyncResult> {
  const base: PlatformSyncResult = { platform: "spotify", followers: null, monthly_plays: null };

  const artistMatch = url.match(/open\.spotify\.com\/artist\/([a-zA-Z0-9]+)/);
  if (!artistMatch) return { ...base, error: "No se pudo extraer el Artist ID de la URL de Spotify" };
  const artistId = artistMatch[1];

  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
    return { ...base, error: "SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET no configuradas" };
  }

  const token = await getSpotifyAccessToken();
  if (!token) return { ...base, error: "No se pudo obtener token de Spotify" };

  try {
    const res = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    });
    if (!res.ok) {
      const body = await res.text();
      return { ...base, error: `Spotify API ${res.status}: ${body.slice(0, 120)}` };
    }

    const data = await res.json();
    const followers = data.followers?.total ?? null;
    // Monthly listeners not available in the public Web API
    return { ...base, followers };
  } catch (err) {
    return { ...base, error: err instanceof Error ? err.message : "Error de red" };
  }
}

// ─── Public dispatcher ───────────────────────────────────────────────────────

export async function fetchPlatformStats(
  platform: string,
  url: string
): Promise<PlatformSyncResult> {
  switch (platform) {
    case "youtube":
      return fetchYouTubeStats(url);
    case "spotify":
      return fetchSpotifyStats(url);
    default:
      return {
        platform,
        followers: null,
        monthly_plays: null,
        error: `La plataforma '${platform}' no soporta sincronización automática`,
      };
  }
}
