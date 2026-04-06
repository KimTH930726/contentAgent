"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import GlassCard from "./GlassCard";
import type { QualityCompareResponse } from "@/lib/api";

interface Props {
  result: QualityCompareResponse;
  originalPreviewUrl: string;
  generatedBase64: string;
}

interface ScoreBarProps {
  label: string;
  value: number;
  color: string;
  delay: number;
}

function ScoreBar({ label, value, color, delay }: ScoreBarProps) {
  const barRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!barRef.current) return;
    gsap.fromTo(
      barRef.current,
      { width: "0%" },
      {
        width: `${Math.round(value * 100)}%`,
        duration: 1.2,
        delay,
        ease: "power3.out",
      }
    );
  }, [value]);

  const pct = Math.round(value * 100);

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-white/40 text-xs">{label}</span>
        <span className="text-white/70 text-xs font-mono font-medium">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          ref={barRef}
          className="h-full rounded-full"
          style={{ backgroundColor: color, width: 0 }}
        />
      </div>
    </div>
  );
}

function scoreColor(v: number): string {
  if (v >= 0.80) return "#34d399";
  if (v >= 0.65) return "#fbbf24";
  return "#f87171";
}

function scoreLabel(v: number): string {
  if (v >= 0.80) return "PASS";
  if (v >= 0.65) return "MARGINAL";
  return "FAIL";
}

export default function QualityTestPanel({ result, originalPreviewUrl, generatedBase64 }: Props) {
  const { quality_score, passed } = result;
  const overall = quality_score.overall;

  return (
    <GlassCard className="p-5 space-y-5" animate>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <h3 className="text-white/90 font-semibold text-sm tracking-wide">REVERSE QUALITY TEST</h3>
        </div>
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, delay: 0.3 }}
          className="text-xs px-3 py-1 rounded-full font-bold"
          style={{
            backgroundColor: passed ? "rgba(52,211,153,0.15)" : "rgba(248,113,113,0.15)",
            border: `1px solid ${passed ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
            color: passed ? "#34d399" : "#f87171",
          }}
        >
          {scoreLabel(overall)}
        </motion.span>
      </div>

      {/* Side-by-side comparison */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <p className="text-white/25 text-xs text-center">Original</p>
          <div className="relative rounded-xl overflow-hidden aspect-square bg-white/[0.03] border border-white/[0.06]">
            <img src={originalPreviewUrl} alt="Original" className="w-full h-full object-cover" />
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-white/25 text-xs text-center">Generated</p>
          <div className="relative rounded-xl overflow-hidden aspect-square bg-white/[0.03] border border-white/[0.06]">
            <img
              src={`data:image/png;base64,${generatedBase64}`}
              alt="Generated"
              className="w-full h-full object-cover"
            />
            {/* Similarity overlay badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="absolute bottom-2 right-2 text-xs font-bold px-2 py-0.5 rounded-lg backdrop-blur-sm"
              style={{
                backgroundColor: "rgba(0,0,0,0.5)",
                color: scoreColor(overall),
              }}
            >
              {Math.round(overall * 100)}%
            </motion.div>
          </div>
        </div>
      </div>

      {/* Score bars */}
      <div className="space-y-3">
        <ScoreBar
          label="Color Match"
          value={quality_score.color_match}
          color={scoreColor(quality_score.color_match)}
          delay={0.4}
        />
        <ScoreBar
          label="Style Match"
          value={quality_score.style_match}
          color={scoreColor(quality_score.style_match)}
          delay={0.55}
        />
        <ScoreBar
          label="Composition Match"
          value={quality_score.composition_match}
          color={scoreColor(quality_score.composition_match)}
          delay={0.7}
        />
      </div>

      {/* Feedback */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3"
      >
        <p className="text-white/20 text-xs mb-1">Agent Feedback</p>
        <p className="text-white/60 text-sm">{quality_score.feedback}</p>
      </motion.div>
    </GlassCard>
  );
}
