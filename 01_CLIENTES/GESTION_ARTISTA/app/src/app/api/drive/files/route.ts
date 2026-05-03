/**
 * GET /api/drive/files
 *
 * Lista archivos y carpetas del Google Drive del usuario autenticado.
 *
 * Query params:
 *   q          — buscar por nombre (global, ignora folderId)
 *   type       — "audio" | "image" | "all"  (default: "audio")
 *   folderId   — ID de carpeta a listar (omitir → raíz "My Drive")
 *   pageToken  — paginación
 */
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const FOLDER_MIME = "application/vnd.google-apps.folder";

const AUDIO_MIMES = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/aiff",
  "audio/flac",
  "audio/mp4",
  "audio/ogg",
  "audio/x-m4a",
];

const IMAGE_MIMES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

async function getAuthenticatedDrive(userId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("google_access_token, google_refresh_token, google_token_expiry")
    .eq("id", userId)
    .single();

  if (!profile?.google_access_token) return null;

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/auth/google/callback"
  );

  oauth2Client.setCredentials({
    access_token: profile.google_access_token,
    refresh_token: profile.google_refresh_token,
    expiry_date: profile.google_token_expiry
      ? new Date(profile.google_token_expiry).getTime()
      : undefined,
  });

  oauth2Client.on("tokens", async (tokens) => {
    await supabase
      .from("profiles")
      .update({
        google_access_token: tokens.access_token ?? profile.google_access_token,
        google_refresh_token: tokens.refresh_token ?? profile.google_refresh_token,
        google_token_expiry: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
  });

  return google.drive({ version: "v3", auth: oauth2Client });
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const drive = await getAuthenticatedDrive(user.id);
  if (!drive) {
    return NextResponse.json(
      { error: "Google Drive no conectado", needs_auth: true },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query     = searchParams.get("q") ?? "";
  const type      = (searchParams.get("type") ?? "audio") as "audio" | "image" | "all";
  const folderId  = searchParams.get("folderId"); // null → root
  const pageToken = searchParams.get("pageToken") ?? undefined;

  // ── Build MIME filter ────────────────────────────────────────────────────────
  let targetMimes: string[];
  if (type === "image")      targetMimes = IMAGE_MIMES;
  else if (type === "audio") targetMimes = AUDIO_MIMES;
  else                       targetMimes = [...AUDIO_MIMES, ...IMAGE_MIMES];

  const fileMimeQuery = targetMimes.map((m) => `mimeType='${m}'`).join(" or ");

  // ── Build full query ─────────────────────────────────────────────────────────
  let fullQuery: string;

  if (query) {
    // Search mode: look everywhere in Drive (no folder restriction)
    const escapedQuery = query.replace(/'/g, "\\'");
    fullQuery = `(${fileMimeQuery}) and name contains '${escapedQuery}' and trashed=false`;
  } else {
    // Browse mode: list specific folder content (files + subfolders)
    const parent = folderId ? `'${folderId}'` : "'root'";
    fullQuery = `(mimeType='${FOLDER_MIME}' or (${fileMimeQuery})) and ${parent} in parents and trashed=false`;
  }

  try {
    const response = await drive.files.list({
      q: fullQuery,
      fields:
        "nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, webContentLink, thumbnailLink, parents)",
      orderBy: query
        ? "modifiedTime desc"
        : "folder,name",      // folders first when browsing
      pageSize: 100,
      pageToken,
    });

    const files = (response.data.files ?? []).map((f) => ({
      id:           f.id,
      name:         f.name,
      mimeType:     f.mimeType,
      size:         f.size,
      modifiedTime: f.modifiedTime,
      webViewLink:  f.webViewLink,
      webContentLink: f.webContentLink,
      thumbnailLink:  f.thumbnailLink,
      isFolder:     f.mimeType === FOLDER_MIME,
    }));

    return NextResponse.json({
      files,
      nextPageToken: response.data.nextPageToken ?? null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
