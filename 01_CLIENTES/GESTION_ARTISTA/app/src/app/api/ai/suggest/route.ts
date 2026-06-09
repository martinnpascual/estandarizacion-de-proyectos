import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * POST /api/ai/suggest
 * Genera sugerencias de producción para una maqueta usando Pollinations.ai
 * (modelo openai/GPT-4o-mini — gratis, sin API key).
 *
 * Body: {
 *   title: string
 *   status: string
 *   bpm?: number | null
 *   key?: string | null
 *   producer?: string | null
 *   notes?: string | null
 *   monthCreated?: string | null
 * }
 * Response: { suggestions: string[] }
 */
export async function POST(request: NextRequest) {
  // Auth check
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: {
    title?: string;
    status?: string;
    bpm?: number | null;
    key?: string | null;
    producer?: string | null;
    notes?: string | null;
    monthCreated?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const { title, status, bpm, key, producer, notes, monthCreated } = body;
  if (!title || !status) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  // Build the prompt
  const statusLabels: Record<string, string> = {
    borrador: "Borrador (inicio del proceso)",
    en_mezcla: "En mezcla",
    masterizada: "Masterizada",
    lista_para_publicar: "Lista para publicar",
  };

  const contextParts: string[] = [
    `Título: "${title}"`,
    `Estado: ${statusLabels[status] ?? status}`,
    bpm ? `BPM: ${bpm}` : "BPM: no definido",
    key ? `Tonalidad: ${key}` : "Tonalidad: no definida",
    producer ? `Productor: ${producer}` : "",
    notes ? `Notas del artista: "${notes}"` : "",
    monthCreated ? `Creada en: ${monthCreated}` : "",
  ].filter(Boolean);

  const systemPrompt =
    "Eres un productor musical y consultor de industria musical con 20 años de experiencia. " +
    "Respondes siempre en español rioplatense, con tono directo, profesional y motivador. " +
    "Genera exactamente 4 sugerencias concretas y accionables para esta maqueta. " +
    "Cada sugerencia es una sola oración corta (máximo 15 palabras). " +
    "Devuelve SOLO un array JSON: [\"sugerencia1\", \"sugerencia2\", \"sugerencia3\", \"sugerencia4\"]. " +
    "Sin texto adicional, sin explicaciones, sin markdown. Solo el array JSON.";

  const userMessage = contextParts.join(". ") + ". Dame 4 sugerencias para avanzar con esta canción.";

  try {
    // Pollinations.ai text API — free, no key required
    const pollinationsRes = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        model: "openai",
        seed: Math.floor(Math.random() * 99999),
        jsonMode: true,
      }),
      signal: AbortSignal.timeout(15000), // 15s timeout
    });

    if (!pollinationsRes.ok) {
      throw new Error(`Pollinations error: ${pollinationsRes.status}`);
    }

    const raw = await pollinationsRes.text();

    // Try to parse JSON array from response
    let suggestions: string[] = [];
    try {
      // The response might be a JSON array directly or wrapped in code block
      const cleaned = raw
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        suggestions = parsed.slice(0, 4).map(String);
      }
    } catch {
      // Fallback: extract lines that look like suggestions
      suggestions = raw
        .split("\n")
        .filter((l) => l.trim() && !l.startsWith("{") && !l.startsWith("["))
        .map((l) => l.replace(/^[\d\.\-\*\s]+/, "").trim())
        .filter((l) => l.length > 5 && l.length < 120)
        .slice(0, 4);
    }

    if (suggestions.length === 0) {
      throw new Error("No se pudo parsear la respuesta");
    }

    return NextResponse.json({ suggestions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";

    // Return rule-based fallback suggestions so the UI never shows empty
    const fallback = buildFallbackSuggestions(status ?? "borrador", !!bpm, !!key);
    return NextResponse.json({ suggestions: fallback, warning: message });
  }
}

/** Sugerencias de respaldo basadas en reglas cuando la IA no responde */
function buildFallbackSuggestions(status: string, hasBpm: boolean, hasKey: boolean): string[] {
  const byStatus: Record<string, string[]> = {
    borrador: [
      "Grabá una referencia vocal para fijar la estructura.",
      "Definí el tempo y la tonalidad antes de avanzar.",
      "Armá la estructura básica: intro, verso, coro y bridge.",
      "Compartí la demo con un colaborador para feedback temprano.",
    ],
    en_mezcla: [
      "Revisá los niveles de cada pista en un monitor plano.",
      "Aplicá saturación sutil en el bus de drums para más energía.",
      "Asegurate que el vocal tenga reverb coherente con el espacio.",
      "Compará la mezcla con una referencia comercial del mismo género.",
    ],
    masterizada: [
      "Escuchá la master en auriculares, parlantes y teléfono.",
      "Verificá que el LUFS esté entre -14 y -9 para streaming.",
      "Pedí feedback de alguien ajeno al proyecto antes de publicar.",
      "Preparás el arte de tapa, créditos y metadata para distribuir.",
    ],
    lista_para_publicar: [
      "Elegí una fecha de lanzamiento con al menos 2 semanas de anticipación.",
      "Subí la canción a tu distribuidor (TuneCore, DistroKid, etc.).",
      "Preparás el contenido de redes para la semana del lanzamiento.",
      "Contactá playlists y blogs especializados en tu género.",
    ],
  };

  const base = byStatus[status] ?? byStatus["borrador"];
  if (!hasBpm) base[1] = "Analizá el BPM con la herramienta de análisis integrada.";
  if (!hasKey) base[0] = "Identificá la tonalidad de la canción para facilitar la mezcla.";
  return base;
}
