import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Readable } from "stream";
import { rateLimit } from "@/lib/rate-limit";

// ─── Shared: get authenticated Drive client ───────────────────────────────────
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

  // Auto-refresh and persist new tokens
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

// ─── Ensure "Covers" folder exists in Drive ───────────────────────────────────
async function ensureCoversFolder(drive: ReturnType<typeof google.drive>): Promise<string> {
  // Look for existing "GESTION_ARTISTA_COVERS" folder
  const folderName = "GESTION_ARTISTA_COVERS";
  const search = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`,
    fields: "files(id, name)",
    pageSize: 1,
  });

  if (search.data.files && search.data.files.length > 0) {
    return search.data.files[0].id!;
  }

  // Create the folder
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  return folder.data.id!;
}

// ─── POST /api/drive/upload ────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Rate limit: 60 uploads per user per hour
  const { allowed, resetAt } = rateLimit(`upload:${user.id}`, 60, 60 * 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Demasiadas subidas. Intentá de nuevo en un rato." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) },
      }
    );
  }

  const drive = await getAuthenticatedDrive(user.id);
  if (!drive) {
    return NextResponse.json(
      { error: "Google Drive no conectado", needs_auth: true },
      { status: 403 }
    );
  }

  // Parse multipart form
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Formato de solicitud inválido" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No se encontró el archivo" }, { status: 400 });
  }

  // Validate type and size
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Solo se permiten imágenes" }, { status: 400 });
  }
  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "La imagen no puede superar 10 MB" }, { status: 400 });
  }

  try {
    // Get or create the covers folder
    const folderId = await ensureCoversFolder(drive);

    // Convert File to Node.js Readable stream
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const readable = Readable.from(buffer);

    // Upload to Drive
    const uploadedFile = await drive.files.create({
      requestBody: {
        name: file.name,
        mimeType: file.type,
        parents: [folderId],
      },
      media: {
        mimeType: file.type,
        body: readable,
      },
      fields: "id, name, webViewLink, thumbnailLink",
    });

    const fileId = uploadedFile.data.id!;

    // Use the app's own streaming proxy — more reliable than direct Drive embed URLs
    // which Google has deprecated for inline display.
    const coverUrl = `/api/drive/stream/${fileId}`;

    return NextResponse.json({
      fileId,
      url: coverUrl,
      name: uploadedFile.data.name,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al subir la imagen";
    // Detect insufficient scopes — user needs to re-authorize with drive.file scope
    if (
      message.includes("insufficient authentication scopes") ||
      message.includes("insufficientPermissions") ||
      message.includes("Request had insufficient")
    ) {
      return NextResponse.json(
        { error: "Permisos de Drive insuficientes. Reconectá tu cuenta de Google.", needs_auth: true },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
