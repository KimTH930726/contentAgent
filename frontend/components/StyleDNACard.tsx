"use client";

import { motion } from "framer-motion";
import GlassCard from "./GlassCard";
import type { AnalyzeResponse } from "@/lib/api";

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

interface Props {
  data: AnalyzeResponse;
}

export default function StyleDNACard({ data }: Props) {
  const { style_dna, filename } = data;

  return (
    <GlassCard className="p-5" animate>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-violet-400" />
          <h3 className="text-white/90 font-semibold text-sm tracking-wide">STYLE DNA</h3>
          <span className="text-white/25 text-xs ml-auto truncate max-w-[140px]">{filename}</span>
        </motion.div>

        {/* Color Palette */}
        <motion.div variants={itemVariants}>
          <p className="text-white/30 text-xs mb-2 uppercase tracking-wider">Color Palette</p>
          <div className="flex gap-2">
            {style_dna.color_palette.map((color, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 * i, type: "spring", stiffness: 300 }}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className="w-8 h-8 rounded-lg border border-white/10 shadow-lg"
                  style={{ backgroundColor: color }}
                />
                <span className="text-white/20 text-[9px] font-mono">{color}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Mood & Lighting */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
            <p className="text-white/25 text-xs mb-1">Mood</p>
            <p className="text-white/80 text-sm capitalize">{style_dna.mood}</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
            <p className="text-white/25 text-xs mb-1">Lighting</p>
            <p className="text-white/80 text-sm capitalize">{style_dna.lighting}</p>
          </div>
        </motion.div>

        {/* Composition */}
        <motion.div variants={itemVariants} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
          <p className="text-white/25 text-xs mb-1">Composition</p>
          <p className="text-white/80 text-sm capitalize">{style_dna.composition}</p>
        </motion.div>

        {/* Style Keywords */}
        <motion.div variants={itemVariants}>
          <p className="text-white/30 text-xs mb-2 uppercase tracking-wider">Keywords</p>
          <div className="flex flex-wrap gap-2">
            {style_dna.style_keywords.map((kw, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 * i }}
                className="text-xs px-3 py-1 rounded-full bg-violet-500/15 border border-violet-400/20 text-violet-300"
              >
                {kw}
              </motion.span>
            ))}
          </div>
        </motion.div>

        {/* Raw Description */}
        <motion.div variants={itemVariants} className="rounded-xl bg-cyan-500/5 border border-cyan-400/10 p-3">
          <p className="text-white/25 text-xs mb-1">Analysis</p>
          <p className="text-white/50 text-xs leading-relaxed font-mono">{style_dna.raw_description}</p>
        </motion.div>
      </motion.div>
    </GlassCard>
  );
}
