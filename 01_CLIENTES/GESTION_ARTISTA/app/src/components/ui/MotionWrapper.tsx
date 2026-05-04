"use client";

/**
 * MotionWrapper — Primitivas de animación con Framer Motion
 * Usar en páginas/componentes para transiciones y micro-animaciones
 */
import {
  motion,
  AnimatePresence,
  useSpring,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState, memo } from "react";
import type { HTMLAttributes, ReactNode, ButtonHTMLAttributes } from "react";

// ─── FadeIn ───────────────────────────────────────────────────────────────────
interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}
export function FadeIn({ children, delay = 0, duration = 0.4, className }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── SlideUp ──────────────────────────────────────────────────────────────────
interface SlideUpProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}
export function SlideUp({ children, delay = 0, duration = 0.4, className }: SlideUpProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Reveal (viewport-triggered) ─────────────────────────────────────────────
/**
 * Se anima al entrar en el viewport.
 * Ideal para secciones lazy que aparecen al hacer scroll.
 */
interface RevealProps {
  children: ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "scale";
  className?: string;
  once?: boolean;
}
export function Reveal({
  children,
  delay = 0,
  direction = "up",
  className,
  once = true,
}: RevealProps) {
  const initial = {
    up:    { opacity: 0, y: 24 },
    down:  { opacity: 0, y: -24 },
    left:  { opacity: 0, x: 24 },
    right: { opacity: 0, x: -24 },
    scale: { opacity: 0, scale: 0.92 },
  }[direction];

  const animate = direction === "scale"
    ? { opacity: 1, scale: 1 }
    : direction === "left" || direction === "right"
      ? { opacity: 1, x: 0 }
      : { opacity: 1, y: 0 };

  return (
    <motion.div
      initial={initial}
      whileInView={animate}
      viewport={{ once, margin: "-40px" }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── StaggerList ──────────────────────────────────────────────────────────────
const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.055,
      delayChildren: 0.05,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
};

interface StaggerListProps {
  children: ReactNode;
  className?: string;
}
export function StaggerList({ children, className }: StaggerListProps) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={staggerItem}
      transition={{ duration: 0.32, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── SpringCard ───────────────────────────────────────────────────────────────
interface SpringCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}
export function SpringCard({ children, className, ...props }: SpringCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.015, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={className}
      {...(props as any)}
    >
      {children}
    </motion.div>
  );
}

// ─── GestureCard (3D tilt on hover) ──────────────────────────────────────────
/**
 * Tarjeta con efecto 3D de perspectiva al pasar el cursor.
 * Rota suavemente siguiendo la posición del mouse.
 * @example
 * <GestureCard className="rounded-2xl border p-4">…</GestureCard>
 */
interface GestureCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  intensity?: number; // grados máximos de rotación (default: 8)
}
export function GestureCard({ children, className, intensity = 8, ...props }: GestureCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const scale   = useMotionValue(1);

  const springConfig = { stiffness: 300, damping: 30, mass: 0.5 };
  const springX = useSpring(rotateX, springConfig);
  const springY = useSpring(rotateY, springConfig);
  const springS = useSpring(scale,   { stiffness: 400, damping: 30 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width  / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    rotateY.set( dx * intensity);
    rotateX.set(-dy * intensity);
    scale.set(1.025);
  }

  function handleMouseLeave() {
    rotateX.set(0);
    rotateY.set(0);
    scale.set(1);
  }

  return (
    <motion.div
      ref={ref}
      style={{ rotateX: springX, rotateY: springY, scale: springS, transformPerspective: 800 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
      {...(props as any)}
    >
      {children}
    </motion.div>
  );
}

// ─── PressButton (spring press haptic) ───────────────────────────────────────
/**
 * Botón con micro-animación de spring al presionar.
 * Reemplaza className btn-press para un efecto más natural.
 */
interface PressButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  className?: string;
}
export function PressButton({ children, className, ...props }: PressButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={className}
      {...(props as any)}
    >
      {children}
    </motion.button>
  );
}

// ─── AnimatedCounter ──────────────────────────────────────────────────────────
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}
export function AnimatedCounter({
  value,
  duration = 1.2,
  className,
  prefix = "",
  suffix = "",
  decimals = 0,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { duration: duration * 1000, bounce: 0.1 });

  useEffect(() => {
    motionVal.set(value);
  }, [value, motionVal]);

  useEffect(() => {
    const unsubscribe = spring.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent =
          prefix + latest.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",") + suffix;
      }
    });
    return unsubscribe;
  }, [spring, prefix, suffix, decimals]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
      {suffix}
    </span>
  );
}

// ─── PageTransition ───────────────────────────────────────────────────────────
export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── PresenceList ─────────────────────────────────────────────────────────────
export function PresenceList({ children }: { children: ReactNode }) {
  return <AnimatePresence mode="popLayout">{children}</AnimatePresence>;
}

export function PresenceItem({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      key={id}
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{
        opacity: 0,
        scale: 0.96,
        height: 0,
        marginBottom: 0,
        paddingTop: 0,
        paddingBottom: 0,
      }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── NumberTicker (conteo animado para métricas grandes) ──────────────────────
/**
 * Muestra un número que cuenta desde 0 hasta `value` al montar.
 * Ideal para stat cards en el dashboard.
 */
export const NumberTicker = memo(function NumberTicker({
  value,
  className,
  prefix = "",
  suffix = "",
  decimals = 0,
}: AnimatedCounterProps) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = 900;

    function easeOutQuart(t: number) {
      return 1 - Math.pow(1 - t, 4);
    }

    let raf: number;
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setDisplayed(value * easeOutQuart(progress));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const formatted =
    prefix +
    displayed.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",") +
    suffix;

  return <span className={className}>{formatted}</span>;
});
