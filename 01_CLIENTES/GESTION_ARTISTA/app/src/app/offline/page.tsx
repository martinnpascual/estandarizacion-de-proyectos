import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sin conexión",
};

export default function OfflinePage() {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Sin conexión — Studio</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
            background: #111111;
            color: #e5e5e5;
            min-height: 100svh;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 2rem;
          }
          .container { max-width: 320px; }
          .icon {
            width: 72px; height: 72px;
            margin: 0 auto 1.5rem;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 22px;
            display: flex; align-items: center; justify-content: center;
            font-size: 32px;
          }
          h1 { font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
          p { color: #888; font-size: 0.875rem; line-height: 1.6; margin-bottom: 1.5rem; }
          a {
            display: inline-block;
            padding: 0.6rem 1.25rem;
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 12px;
            color: #e5e5e5;
            text-decoration: none;
            font-size: 0.875rem;
            font-weight: 500;
            transition: background 0.2s;
          }
          a:hover { background: rgba(255,255,255,0.14); }
        `}</style>
      </head>
      <body>
        <div className="container">
          <div className="icon">📡</div>
          <h1>Sin conexión</h1>
          <p>
            No hay internet en este momento. Studio guarda en caché las páginas
            que visitaste recientemente — intentá acceder a ellas.
          </p>
          <a href="/dashboard">Volver al inicio</a>
        </div>
      </body>
    </html>
  );
}
