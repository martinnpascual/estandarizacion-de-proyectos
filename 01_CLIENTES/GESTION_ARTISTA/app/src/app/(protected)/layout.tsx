"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Sidebar from "@/components/layout/Sidebar";
import AudioPlayer, {
  AudioPlayerProvider,
} from "@/components/audio/AudioPlayer";
import { CommandMenuProvider } from "@/components/search/CommandMenu";
import { ToastProvider } from "@/components/ui/ToastProvider";
import NavProgressBar from "@/components/ui/NavProgressBar";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  // MED-04: Verificar auth client-side como respaldo del middleware
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/auth/login");
      } else {
        setIsChecking(false);
      }
    });
  }, [router]);

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <ToastProvider>
      <CommandMenuProvider>
        <AudioPlayerProvider>
          <div className="flex min-h-screen">
            <NavProgressBar />
            <Sidebar />
            {/* Contenido principal — con padding para sidebar y player */}
            {/* pb-40 on mobile: bottom tab nav (~56px) + audio player (~64px) + gap */}
            <main className="flex-1 md:ml-0 pb-40 md:pb-24 pt-14 md:pt-0">
              <div className="p-4 md:p-6 lg:p-8 page-enter">{children}</div>
            </main>
            <AudioPlayer />
          </div>
        </AudioPlayerProvider>
      </CommandMenuProvider>
    </ToastProvider>
  );
}
