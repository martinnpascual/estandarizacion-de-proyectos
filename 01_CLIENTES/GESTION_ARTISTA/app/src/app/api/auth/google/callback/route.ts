import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/dashboard?google_error=" + error, request.url));
  }
  if (!code) {
    return NextResponse.redirect(new URL("/dashboard?google_error=no_code", request.url));
  }

  // Validar state para protección CSRF
  const storedState = request.cookies.get("google_oauth_state")?.value;
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(new URL("/dashboard?google_error=invalid_state", request.url));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  // Mismo redirect_uri dinámico que en /api/auth/google/route.ts
  const redirectUri = `${origin}/api/auth/google/callback`;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  try {
    const { tokens } = await oauth2Client.getToken(code);

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    await supabase
      .from("profiles")
      .update({
        google_access_token: tokens.access_token ?? null,
        google_refresh_token: tokens.refresh_token ?? null,
        google_token_expiry: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    // Limpiar cookie de state
    const response = NextResponse.redirect(new URL("/dashboard?google_connected=true", request.url));
    response.cookies.delete("google_oauth_state");
    return response;
  } catch (err) {
    console.error("Google OAuth error:", err);
    return NextResponse.redirect(new URL("/dashboard?google_error=token_exchange", request.url));
  }
}
