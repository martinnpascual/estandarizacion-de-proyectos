import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analizar",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

