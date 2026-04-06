"use client";

import { motion } from "framer-motion";
import clsx from "clsx";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
  animate?: boolean;
}

export default function GlassCard({
  children,
  className,
  glow = false,
  animate = false,
}: GlassCardProps) {
  const base =
    "relative rounded-2xl border border-white/[0.08] backdrop-blur-xl bg-white/[0.04]";
  const glowStyle = glow
    ? "shadow-[0_0_40px_rgba(124,58,237,0.15),inset_0_1px_0_rgba(255,255,255,0.06)]"
    : "shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)]";

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={clsx(base, glowStyle, className)}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={clsx(base, glowStyle, className)}>{children}</div>;
}
