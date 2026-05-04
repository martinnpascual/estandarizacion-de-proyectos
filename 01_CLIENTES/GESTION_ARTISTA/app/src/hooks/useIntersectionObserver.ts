"use client";

import { useEffect, useRef, useState } from "react";

/**
 * useIntersectionObserver — detecta cuando un elemento entra en el viewport.
 * Ideal para lazy-load de secciones pesadas y animaciones de entrada.
 *
 * @example
 * const { ref, isVisible } = useIntersectionObserver({ threshold: 0.15 });
 * <div ref={ref} className={isVisible ? "animate-fade-in" : "opacity-0"}>...</div>
 */
export function useIntersectionObserver({
  threshold = 0.1,
  rootMargin = "0px",
  triggerOnce = true,
}: {
  threshold?: number;
  rootMargin?: string;
  /** Si true, deja de observar después de la primera vez que es visible */
  triggerOnce?: boolean;
} = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) observer.unobserve(el);
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isVisible };
}
