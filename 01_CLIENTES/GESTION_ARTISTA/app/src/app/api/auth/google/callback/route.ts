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

  // Trim para evitar problemas con \n en variables de entorno
  const clientId = process.env.GOOGLE_CLIENT_ID!.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!.trim();
  const redirectUri = `${origin}/api/auth/google/callback`;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

  try {
    const { tokens } = await oauth2Client.getToken(code);

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    // Obtener JWT del usuario para la llamada directa a la REST API de Supabase.
    // El SDK de Supabase falla silenciosamente en UPDATE desde Vercel serverless,
    // pero fetch() directo con el JWT del usuario sí funciona (RLS permite auth.uid() = id).
    const { data: { session } } = await supabase.auth.getSession();
    const jwt = session?.access_token;

    if (!jwt) {
      console.error("[google/callback] No JWT en sesión — usuario no autenticado");
      return NextResponse.redirect(new URL("/dashboard?google_error=no_session", request.url));
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    let saveOk = false;

    try {
      const patchRes = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}`,
        {
          method: "PATCH",
          headers: {
            "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            "Authorization": `Bearer ${jwt}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            google_access_token: tokens.access_token ?? null,
            google_refresh_token: tokens.refresh_token ?? null,
            google_token_expiry: tokens.expiry_date
              ? new Date(tokens.expiry_date).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          }),
          signal: ctrl.signal,
        }
      );
      clearTimeout(timer);
      saveOk = patchRes.status === 204 || patchRes.status === 200;
      if (!saveOk) {
        const body = await patchRes.text().catch(() => "");
        console.error(`[google/callback] PATCH falló: ${patchRes.status} ${body}`);
      }
    } catch (fetchErr) {
      clearTimeout(timer);
      console.error("[google/callback] PATCH error:", fetchErr);
    }

    const redirectTarget = saveOk
      ? "/dashboard?google_connected=true"
      : "/dashboard?google_error=save_failed";

    const response = NextResponse.redirect(new URL(redirectTarget, request.url));
    response.cookies.delete("google_oauth_state");
    return response;
  } catch (err) {
    console.error("Google OAuth error:", err);
    return NextResponse.redirect(new URL("/dashboard?google_error=token_exchange", request.url));
  }
}
