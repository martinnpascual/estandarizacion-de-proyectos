"use client";

import { useState, useEffect } from "react";

/**
 * Debounces a value — ideal para búsquedas en tiempo real.
 * Evita disparar fetches en cada keystroke.
 */
export function useDebounce<T>(value: T, delayMs: number = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
