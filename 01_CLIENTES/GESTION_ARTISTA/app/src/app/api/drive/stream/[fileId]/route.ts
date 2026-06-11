/**
 * /api/drive/stream/[fileId]
 *
 * Proxy de streaming para archivos de Google Drive.
 * Maneja Range headers correctamente para que el <audio> pueda hacer seeking.
 *
 * Flujo:
 *  1. Autenticar usuario via Supabase session
 *  2. Obtener access_token de OAuth (con auto-refresh si está vencido)
 *  3. Hacer GET al endpoint de media de Drive con el token + Range header
 *  4. Piping de la respuesta al cliente con los headers correctos
 *
 * URL de uso:  /api/drive/stream/{fileId}
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// ── Token management ──────────────────────────────────────────────────────────

interface TokenInfo {
  access_token: string;
  refresh_token: string | null;
  token_expiry: string | null;
}

async function getValidAccessToken(userId: string): Promise<string | null> {
  const supabase = await createServerSupabaseClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("google_access_token, google_refresh_token, google_token_expiry")
    .eq("id", userId)
    .single();

  if (!profile?.google_access_token) return null;

  const tokens: TokenInfo = {
    access_token: profile.google_access_token,
    refresh_token: profile.google_refresh_token ?? null,
    token_expiry: profile.google_token_expiry ?? null,
  };

  // Check if token is still valid (with 60s buffer)
  const expiryMs = tokens.token_expiry ? new Date(tokens.token_expiry).getTime() : 0;
  if (expiryMs > Date.now() + 60_000) {
    return tokens.access_token;
  }

  // Token expired or about to expire — try to refresh
  if (!tokens.refresh_token) return null;

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    refresh_token: tokens.refresh_token,
    grant_type: "refresh_token",
  });

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) return null;

  const refreshed = await res.json() as {
    access_token: string;
    expires_in: number;
  };

  const newToken = refreshed.access_token;
  const newExpiry = refreshed.expires_in
    ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
    : null;

  // Persist refreshed token (fire-and-forget; don't block streaming on it)
  supabase
    .from("profiles")
    .update({
      google_access_token: newToken,
      google_token_expiry: newExpiry,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .then(() => {});

  return newToken;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  // 1. Autenticar
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("No autenticado", { status: 401 });
  }

  // 2. Obtener token válido
  const accessToken = await getValidAccessToken(user.id);
  if (!accessToken) {
    return new NextResponse(
      JSON.stringify({ error: "Google Drive no conectado", needs_auth: true }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const { fileId } = params;

  // Validar fileId (solo alfanuméricos, guiones y underscores)
  if (!fileId || !/^[\w-]+$/.test(fileId)) {
    return new NextResponse("fileId inválido", { status: 400 });
  }

  // Download mode: ?dl=1&name=<filename>
  const url = new URL(request.url);
  const isDownload = url.searchParams.get("dl") === "1";
  const downloadName = url.searchParams.get("name") ?? fileId;

  // 3. Construir request hacia Drive
  const driveUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`;

  const driveHeaders: HeadersInit = {
    Authorization: `Bearer ${accessToken}`,
  };

  // Pasar Range header si existe (necesario para seeking en <audio>)
  // No enviar Range en modo descarga para obtener el archivo completo
  const rangeHeader = request.headers.get("range");
  if (rangeHeader && !isDownload) {
    driveHeaders["Range"] = rangeHeader;
  }

  // 4. Fetch desde Drive
  let driveRes: Response;
  try {
    driveRes = await fetch(driveUrl, {
      headers: driveHeaders,
      cache: "no-store",
    });
  } catch (err) {
    console.error("[drive/stream] fetch error:", err);
    return new NextResponse("Error al conectar con Google Drive", { status: 502 });
  }

  // 5. Manejar respuesta de Drive
  if (driveRes.status === 401 || driveRes.status === 403) {
    return new NextResponse(
      JSON.stringify({ error: "Token de Google inválido o expirado", needs_auth: true }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!driveRes.ok && driveRes.status !== 206) {
    const errBody = await driveRes.text().catch(() => "");
    console.error(`[drive/stream] Drive error ${driveRes.status}:`, errBody);
    return new NextResponse("Error al obtener el archivo de Drive", { status: driveRes.status });
  }

  // 6. Construir headers de respuesta
  const resHeaders = new Headers();

  // Content-Type: Drive lo devuelve correctamente para audio/mpeg, audio/wav, etc.
  const contentType = driveRes.headers.get("content-type") ?? "audio/mpeg";
  resHeaders.set("content-type", contentType);

  if (isDownload) {
    // Modo descarga: forzar descarga del archivo con nombre legible
    // Inferir extensión desde content-type
    const extMap: Record<string, string> = {
      "audio/mpeg": ".mp3",
      "audio/mp3": ".mp3",
      "audio/wav": ".wav",
      "audio/wave": ".wav",
      "audio/x-wav": ".wav",
      "audio/ogg": ".ogg",
      "audio/flac": ".flac",
      "audio/aac": ".aac",
      "audio/mp4": ".m4a",
      "video/mp4": ".mp4",
    };
    const ext = extMap[contentType.split(";")[0].trim()] ?? "";
    // Agregar extensión solo si el nombre aún no la tiene
    const hasExt = /\.\w{2,5}$/.test(downloadName);
    const filename = hasExt ? downloadName : `${downloadName}${ext}`;
    // Sanitizar para header (reemplazar comillas)
    const safeFilename = filename.replace(/"/g, "'");
    resHeaders.set("content-disposition", `attachment; filename="${safeFilename}"`);
    resHeaders.set("cache-control", "no-cache");
  } else {
    // Modo streaming: soporte para seeking
    resHeaders.set("accept-ranges", "bytes");
    const contentRange = driveRes.headers.get("content-range");
    if (contentRange) resHeaders.set("content-range", contentRange);
    resHeaders.set("cache-control", "private, max-age=3600");
  }

  const contentLength = driveRes.headers.get("content-length");
  if (contentLength) resHeaders.set("content-length", contentLength);

  // 7. Stream de vuelta al cliente
  return new NextResponse(driveRes.body, {
    status: isDownload ? 200 : driveRes.status,
    headers: resHeaders,
  });
}
