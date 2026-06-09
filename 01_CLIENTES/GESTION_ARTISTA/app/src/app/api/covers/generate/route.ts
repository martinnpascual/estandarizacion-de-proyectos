import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/covers/generate
 * Returns a Pollinations.ai image URL for preview — no server-side binary fetch,
 * which avoids Vercel's 10s function timeout.
 *
 * Body: { prompt: string }
 * Response: { imageUrl: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // Rate limit: 20 covers per user per hour
  const { allowed, resetAt } = rateLimit(`covers:${user.id}`, 20, 60 * 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intentá de nuevo en un rato." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) },
      }
    );
  }

  let body: { prompt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400 });
  }

  const { prompt } = body;
  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json({ error: "Falta el prompt" }, { status: 400 });
  }

  // Random seed so each "Regenerar" produces a different image
  const seed = Math.floor(Math.random() * 999_999);
  const encodedPrompt = encodeURIComponent(prompt.trim());

  // Pollinations.ai — free, no API key, FLUX model, CORS-enabled
  const imageUrl =
    `https://image.pollinations.ai/prompt/${encodedPrompt}` +
    `?width=512&height=512&nologo=true&model=flux-schnell&seed=${seed}&nofeed=true`;

  return NextResponse.json({ imageUrl });
}
