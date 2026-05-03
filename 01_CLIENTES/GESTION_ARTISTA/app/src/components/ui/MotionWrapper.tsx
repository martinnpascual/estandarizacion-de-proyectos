"use client";

/**
 * MotionWrapper — Primitivas de animación con Framer Motion
 * Usar en páginas/componentes para transiciones y micro-animaciones
 */
import { motion, AnimatePresence, useSpring, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";

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

// ─── StaggerList ──────────────────────────────────────────────────────────────
const staggerContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
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
    <motion.div variants={staggerItem} className={className}>
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
