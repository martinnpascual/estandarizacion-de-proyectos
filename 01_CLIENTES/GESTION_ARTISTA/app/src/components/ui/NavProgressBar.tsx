"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function NavProgressBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [key, setKey] = useState(0);

  useEffect(() => {
    setVisible(true);
    setKey((k) => k + 1);
    const t = setTimeout(() => setVisible(false), 700);
    return () => clearTimeout(t);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      key={key}
      className="nav-progress-bar"
      style={{ pointerEvents: "none" }}
    />
  );
}
