import Link from "next/link";
import { Music, Home, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-[#111]">
      <div className="w-full max-w-md text-center space-y-8">
        {/* Big 404 */}
        <div className="relative">
          <p className="text-[120px] font-black leading-none text-white/5 select-none">
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500/30 to-violet-700/20 border border-violet-500/25 flex items-center justify-center">
              <Music className="h-10 w-10 text-violet-400" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white">Página no encontrada</h1>
          <p className="text-sm text-white/50">
            Esta pista no existe o fue eliminada.
          </p>
        </div>

        <div className="flex gap-3 justify-center">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm text-white font-medium transition-all active:scale-95"
          >
            <Home className="h-4 w-4" />
            Volver al inicio
          </Link>
          <Link
            href="/buscar"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-sm text-white font-medium transition-all active:scale-95"
          >
            <Search className="h-4 w-4" />
            Buscar
          </Link>
        </div>
      </div>
    </div>
  );
}
