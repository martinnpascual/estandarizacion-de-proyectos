/**
 * Social platform stat fetching logic.
 * Used by both the Vercel cron route and the manual Server Action.
 *
 * Supported platforms (public endpoints, no user OAuth needed):
 *   - YouTube   → YouTube Data API v3 (env: YOUTUBE_API_KEY)
 *   - Spotify   → Client Credentials flow (env: SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET)
 *   - Instagram → Unofficial web_profile_info endpoint (no key needed, best-effort)
 *   - TikTok    → SSR page scraping with browser headers (best-effort)
 *
 * Sync frequency: Weekly (every Monday at 09:00 UTC via Vercel cron)
 */

export interface PlatformSyncResult {
  platform: string;
  followers: number | null;
  monthly_plays: number | null;
  error?: string;
}

/** Platforms with working auto-sync support. */
export const AUTO_SYNC_PLATFORMS = ["youtube", "spotify", "instagram", "tiktok"] as const;
export type AutoSyncPlatform = (typeof AUTO_SYNC_PLATFORMS)[number];

export function supportsAutoSync(platform: string): platform is AutoSyncPlatform {
  return (AUTO_SYNC_PLATFORMS as readonly string[]).includes(platform);
}

// ─── Shared browser headers (helps bypass bot detection) ─────────────────────
const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
};

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

  // Legacy /c/ or /user/ — treat as handle
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

    const followers = channel.statistics?.subscriberCount != null
      ? parseInt(channel.statistics.subscriberCount, 10)
      : null;
    const monthly_plays = channel.statistics?.viewCount != null
      ? parseInt(channel.statistics.viewCount, 10)
      : null;

    return { ...base, followers, monthly_plays };
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

/** Parse monthly listeners from Spotify's public artist page HTML (og:description). */
function parseSpotifyMonthlyListeners(html: string): number | null {
  // Meta description: "Artist · 1,234,567 monthly listeners."
  const match = html.match(/(\d[\d,\.]+)\s+monthly listeners/i);
  if (!match) return null;
  const cleaned = match[1].replace(/[,\.]/g, "").replace(/(\d{3})$/, "$1");
  // Handle formats like "1.2M" or raw numbers
  const raw = match[1].replace(/,/g, "");
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
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

  let followers: number | null = null;
  let monthly_plays: number | null = null;

  // 1. Get followers via official API
  try {
    const res = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 0 },
    });
    if (res.ok) {
      const data = await res.json();
      followers = data.followers?.total ?? null;
    }
  } catch { /* continue */ }

  // 2. Try to scrape monthly listeners from public Spotify page
  try {
    const pageRes = await fetch(`https://open.spotify.com/artist/${artistId}`, {
      headers: { ...BROWSER_HEADERS, Accept: "text/html,application/xhtml+xml" },
      next: { revalidate: 0 },
    });
    if (pageRes.ok) {
      const html = await pageRes.text();
      monthly_plays = parseSpotifyMonthlyListeners(html);
    }
  } catch { /* monthly_plays stays null */ }

  if (followers === null && monthly_plays === null) {
    return { ...base, error: "No se obtuvieron datos de Spotify" };
  }

  return { ...base, followers, monthly_plays };
}

// ─── Instagram ────────────────────────────────────────────────────────────────

function extractInstagramUsername(url: string): string | null {
  // https://instagram.com/username or https://www.instagram.com/username/
  const match = url.match(/instagram\.com\/([a-zA-Z0-9._]+)\/?(?:\?|$)/);
  return match ? match[1] : null;
}

async function fetchInstagramStats(url: string): Promise<PlatformSyncResult> {
  const base: PlatformSyncResult = { platform: "instagram", followers: null, monthly_plays: null };

  const username = extractInstagramUsername(url);
  if (!username) return { ...base, error: "No se pudo extraer el username de Instagram" };

  // Instagram's unofficial web profile endpoint (no OAuth, mimics the web app)
  // x-ig-app-id is Instagram's own public web app identifier
  try {
    const res = await fetch(
      `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
      {
        headers: {
          ...BROWSER_HEADERS,
          "x-ig-app-id": "936619743392459",
          "x-requested-with": "XMLHttpRequest",
          Referer: "https://www.instagram.com/",
          Origin: "https://www.instagram.com",
        },
        next: { revalidate: 0 },
      }
    );

    if (!res.ok) {
      return { ...base, error: `Instagram devolvió ${res.status} — puede requerir sesión activa` };
    }

    const data = await res.json();
    const user = data?.data?.user;
    if (!user) return { ...base, error: "No se encontró el usuario en la respuesta de Instagram" };

    const followers = user.edge_followed_by?.count ?? null;
    // monthly_plays = posts count (useful as engagement proxy — not ideal but best available)
    const monthly_plays = user.edge_owner_to_timeline_media?.count ?? null;

    return { ...base, followers, monthly_plays };
  } catch (err) {
    return { ...base, error: err instanceof Error ? err.message : "Error al conectar con Instagram" };
  }
}

// ─── TikTok ───────────────────────────────────────────────────────────────────

function extractTikTokUsername(url: string): string | null {
  // https://tiktok.com/@username or https://www.tiktok.com/@username
  const match = url.match(/tiktok\.com\/@([a-zA-Z0-9._-]+)/);
  return match ? match[1] : null;
}

async function fetchTikTokStats(url: string): Promise<PlatformSyncResult> {
  const base: PlatformSyncResult = { platform: "tiktok", followers: null, monthly_plays: null };

  const username = extractTikTokUsername(url);
  if (!username) return { ...base, error: "No se pudo extraer el username de TikTok" };

  try {
    const res = await fetch(`https://www.tiktok.com/@${encodeURIComponent(username)}`, {
      headers: {
        ...BROWSER_HEADERS,
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
      },
      next: { revalidate: 0 },
      redirect: "follow",
    });

    if (!res.ok) {
      return { ...base, error: `TikTok devolvió ${res.status}` };
    }

    const html = await res.text();

    // TikTok embeds full user data in a JSON script tag
    const scriptMatch = html.match(
      /<script\s+id="__UNIVERSAL_DATA_FOR_REHYDRATION__"\s+type="application\/json">([^<]+)<\/script>/
    );

    if (scriptMatch) {
      try {
        const json = JSON.parse(scriptMatch[1]);
        // Navigate the deeply nested structure
        const defaultScope = json?.__DEFAULT_SCOPE__;
        const webappDetail =
          defaultScope?.["webapp.user-detail"] ??
          defaultScope?.["webapp.userDetail"];
        const userInfo =
          webappDetail?.userInfo ??
          webappDetail?.user_info;
        const stats = userInfo?.stats ?? userInfo?.statsV2;

        if (stats) {
          const followers =
            stats.followerCount != null ? parseInt(String(stats.followerCount), 10) : null;
          const monthly_plays =
            stats.heartCount != null ? parseInt(String(stats.heartCount), 10) : // total likes
            stats.diggCount != null ? parseInt(String(stats.diggCount), 10) :
            null;
          return { ...base, followers, monthly_plays };
        }
      } catch { /* JSON parse failed, try fallback */ }
    }

    // Fallback: look for follower count in meta tags or og tags
    const metaMatch = html.match(/"followerCount"\s*:\s*(\d+)/);
    if (metaMatch) {
      return { ...base, followers: parseInt(metaMatch[1], 10) };
    }

    return { ...base, error: "No se pudo extraer datos del perfil de TikTok (posible bloqueo de bot)" };
  } catch (err) {
    return { ...base, error: err instanceof Error ? err.message : "Error al conectar con TikTok" };
  }
}

// ─── YouTube goal helpers ─────────────────────────────────────────────────────

/** Extract a YouTube video ID from various URL formats */
export function extractYouTubeVideoId(url: string): string | null {
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  const pathMatch = url.match(/youtube\.com\/(?:shorts|embed|v)\/([a-zA-Z0-9_-]{11})/);
  if (pathMatch) return pathMatch[1];

  return null;
}

export type YouTubeGoalMetric = "subscribers" | "views";

export function detectYouTubeGoalMetric(url: string): YouTubeGoalMetric {
  return extractYouTubeVideoId(url) ? "views" : "subscribers";
}

export interface YouTubeGoalResult {
  value: number | null;
  metric: YouTubeGoalMetric;
  error?: string;
}

export async function fetchYouTubeGoalStat(url: string): Promise<YouTubeGoalResult> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return { value: null, metric: "subscribers", error: "YOUTUBE_API_KEY no configurada" };

  const videoId = extractYouTubeVideoId(url);

  if (videoId) {
    const params = new URLSearchParams({ part: "statistics", id: videoId, key: apiKey });
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?${params}`,
        { next: { revalidate: 0 } }
      );
      if (!res.ok) {
        const body = await res.text();
        return { value: null, metric: "views", error: `YouTube API ${res.status}: ${body.slice(0, 100)}` };
      }
      const data = await res.json();
      const item = data.items?.[0];
      if (!item) return { value: null, metric: "views", error: "Video no encontrado" };
      const raw = item.statistics?.viewCount;
      return { value: raw != null ? parseInt(raw, 10) : null, metric: "views" };
    } catch (err) {
      return { value: null, metric: "views", error: err instanceof Error ? err.message : "Error de red" };
    }
  }

  const channelStats = await fetchYouTubeStats(url);
  return {
    value: channelStats.followers,
    metric: "subscribers",
    error: channelStats.error,
  };
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
    case "instagram":
      return fetchInstagramStats(url);
    case "tiktok":
      return fetchTikTokStats(url);
    default:
      return {
        platform,
        followers: null,
        monthly_plays: null,
        error: `La plataforma '${platform}' no soporta sincronización automática`,
      };
  }
}
