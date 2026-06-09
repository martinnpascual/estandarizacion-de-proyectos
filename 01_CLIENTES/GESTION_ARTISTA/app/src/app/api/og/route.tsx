import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

/**
 * GET /api/og?name=ARTISTA&bio=...&songs=42
 * Generates a 1200×630 OG image for the public EPK page.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name") ?? "Artista";
  const bio = searchParams.get("bio") ?? "";
  const songs = searchParams.get("songs") ?? "0";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0a0a0f 0%, #13102b 50%, #0a0a0f 100%)",
          padding: "60px",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative glow */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            left: "-100px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            right: "-80px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99,102,241,0.20) 0%, transparent 70%)",
          }}
        />

        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between", position: "relative" }}>
          {/* Top: tag */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(124,58,237,0.15)",
              border: "1px solid rgba(124,58,237,0.3)",
              borderRadius: "100px",
              padding: "6px 16px",
              width: "fit-content",
            }}
          >
            <span style={{ color: "#a78bfa", fontSize: "14px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              EPK · Electronic Press Kit
            </span>
          </div>

          {/* Artist name */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div
              style={{
                fontSize: name.length > 12 ? "72px" : "96px",
                fontWeight: 900,
                color: "white",
                lineHeight: 1,
                letterSpacing: "-2px",
              }}
            >
              {name.toUpperCase()}
            </div>
            {bio && (
              <div
                style={{
                  fontSize: "22px",
                  color: "rgba(255,255,255,0.55)",
                  maxWidth: "700px",
                  lineHeight: 1.4,
                }}
              >
                {bio.length > 120 ? bio.slice(0, 117) + "…" : bio}
              </div>
            )}
          </div>

          {/* Bottom stats */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "36px", fontWeight: 900, color: "white" }}>{songs}</span>
                <span style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Canciones</span>
              </div>
            </div>
            <div
              style={{
                fontSize: "14px",
                color: "rgba(255,255,255,0.2)",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
              }}
            >
              Studio
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
