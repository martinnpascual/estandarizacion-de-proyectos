import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Google OAuth no configurado. Agrega GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en .env.local" },
      { status: 500 }
    );
  }

  // Usar el origin del request para que redirect_uri coincida con el dominio actual.
  // Esto evita el error de Google "secure response handling" por cross-origin mismatch.
  const { origin } = new URL(request.url);
  const redirectUri = `${origin}/api/auth/google/callback`;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  // Generar state para protección CSRF (requerido por la política de Google)
  const state = crypto.randomBytes(16).toString("hex");

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    state,
    scope: [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/calendar",
    ],
  });

  // Guardar state en cookie para validarlo en el callback
  const response = NextResponse.redirect(url);
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 300, // 5 minutos
    path: "/",
  });

  return response;
}
