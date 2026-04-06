"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "./GlassCard";
import type { GenerateResponse, StyleDNA, QualityCompareResponse } from "@/lib/api";
import { compareQuality } from "@/lib/api";

interface Props {
  data: GenerateResponse;
  originalImageId: string;
  styleDna?: StyleDNA;
  onQualityResult: (result: QualityCompareResponse) => void;
}

export default function GeneratedImageCard({ data, originalImageId, styleDna, onQualityResult }: Props) {
  const [scanDone, setScanDone] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleQualityTest = async () => {
    setTesting(true);
    try {
      const result = await compareQuality(originalImageId, data.image_base64);
      onQualityResult(result);
    } finally {
      setTesting(false);
    }
  };

  return (
    <GlassCard className="overflow-hidden" animate glow>
      {/* Generated image with scan reveal */}
      <div className="relative" style={{ height: 280 }}>
        <img
          src={`data:image/png;base64,${data.image_base64}`}
          alt="Generated"
          className="w-full h-full object-cover"
        />

        {/* Scan line reveal */}
        {!scanDone && (
          <motion.div
            className="absolute inset-0 bg-[#0a0a1a]"
            initial={{ scaleY: 1 }}
            animate={{ scaleY: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            style={{ transformOrigin: "top" }}
            onAnimationComplete={() => setScanDone(true)}
          />
        )}

        {/* Scan line itself */}
        {!scanDone && (
          <motion.div
            className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent pointer-events-none"
            initial={{ top: "0%" }}
            animate={{ top: "100%" }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
          />
        )}

        {/* Top label */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-violet-300 font-medium">
            T2I OUTPUT
          </span>
        </div>

        {/* Color palette dots */}
        {styleDna && (
          <div className="absolute top-3 right-3 flex gap-1.5">
            {styleDna.color_palette.slice(0, 4).map((color, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full border border-white/20 shadow-lg"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        )}

        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0a0a1a] to-transparent" />
      </div>

      {/* Prompt used */}
      <div className="px-4 py-3 border-t border-white/[0.06]">
        <p className="text-white/20 text-xs mb-1.5">Prompt Used</p>
        <p className="text-white/50 text-xs font-mono leading-relaxed line-clamp-2">
          {data.prompt_used}
        </p>
      </div>

      {/* Quality test button */}
      <div className="px-4 pb-4">
        <motion.button
          onClick={handleQualityTest}
          disabled={testing}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-2.5 rounded-xl text-sm font-medium border transition-all disabled:opacity-40"
          style={{
            background: testing
              ? "rgba(255,255,255,0.04)"
              : "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.2))",
            borderColor: testing ? "rgba(255,255,255,0.08)" : "rgba(124,58,237,0.3)",
            color: testing ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.8)",
          }}
        >
          {testing ? (
            <span className="flex items-center justify-center gap-2">
              <span>품질 검증 중</span>
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="inline-block w-1 h-1 rounded-full bg-cyan-400"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
                  />
                ))}
              </span>
            </span>
          ) : (
            "Reverse Quality Test 실행 →"
          )}
        </motion.button>
      </div>
    </GlassCard>
  );
}
