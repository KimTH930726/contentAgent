"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import GlassCard from "./GlassCard";
import { generatePrompt, type PromptGenerateResponse } from "@/lib/api";

interface Props {
  hasData: boolean;
  onPromptReady?: (prompt: string) => void;
}

export default function PromptSynthesizer({ hasData, onPromptReady }: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PromptGenerateResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const borderRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef({ angle: 0 });

  // GSAP spinning gradient border on result card
  useGSAP(() => {
    if (!result || !borderRef.current) return;
    const tween = gsap.to(rotationRef.current, {
      angle: 360,
      duration: 4,
      repeat: -1,
      ease: "none",
      onUpdate: () => {
        if (borderRef.current) {
          borderRef.current.style.setProperty(
            "--gsap-angle",
            `${rotationRef.current.angle}deg`
          );
        }
      },
    });
    return () => tween.kill();
  }, [result]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await generatePrompt(input.trim());
      setResult(data);
      onPromptReady?.(data.synthesized_prompt);
    } catch {
      // No-op — in PoC we could show an error state
    } finally {
      setLoading(false);
    }
  };

  const copyPrompt = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.synthesized_prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Input */}
      <GlassCard className="p-4">
        <form onSubmit={handleSubmit} className="flex gap-3 items-center">
          <div className="relative flex-1">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={hasData ? '예: "산뜻한 봄 느낌으로"' : "먼저 이미지를 업로드하세요"}
              disabled={!hasData || loading}
              className="w-full bg-transparent text-white/80 placeholder-white/20 text-sm outline-none py-1"
            />
            {loading && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
                  />
                ))}
              </div>
            )}
          </div>
          <motion.button
            type="submit"
            disabled={!hasData || !input.trim() || loading}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #2563eb)",
              boxShadow: "0 0 20px rgba(124,58,237,0.3)",
            }}
          >
            합성
          </motion.button>
        </form>
      </GlassCard>

      {/* Result */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* GSAP gradient border wrapper */}
            <div
              ref={borderRef}
              className="relative rounded-2xl p-px"
              style={{
                background: `conic-gradient(from var(--gsap-angle, 0deg), #7c3aed, #2563eb, #06b6d4, #a855f7, #7c3aed)`,
              }}
            >
              <div className="rounded-2xl bg-[#0d0d20] p-5 space-y-4">
                {/* 번역된 쿼리 표시 */}
                {result.translated_query && result.translated_query !== result.user_input && (
                  <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2 flex items-center gap-2 flex-wrap">
                    <span className="text-white/25 text-xs">쿼리 번역</span>
                    <span className="text-white/40 text-xs">"{result.user_input}"</span>
                    <span className="text-white/20 text-xs">→</span>
                    <span className="text-cyan-300/70 text-xs font-mono">"{result.translated_query}"</span>
                  </div>
                )}

                {/* Retrieved results */}
                <div>
                  <p className="text-white/30 text-xs uppercase tracking-wider mb-3">
                    Retrieved Brand DNA ({result.retrieved.results.length})
                  </p>
                  <div className="space-y-2">
                    {result.retrieved.results.map((r, i) => (
                      <motion.div
                        key={r.image_id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]"
                      >
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: r.style_dna.color_palette[0] ?? "#7c3aed",
                          }}
                        />
                        <span className="text-white/40 text-xs truncate flex-1">
                          {r.style_dna.style_keywords.slice(0, 3).join(" · ")}
                        </span>
                        <span className="text-cyan-400/60 text-xs font-mono flex-shrink-0">
                          {(r.score * 100).toFixed(0)}%
                        </span>
                      </motion.div>
                    ))}
                    {result.retrieved.results.length === 0 && (
                      <p className="text-white/20 text-xs">분석된 이미지가 없습니다. 먼저 이미지를 업로드하세요.</p>
                    )}
                  </div>
                </div>

                {/* Final synthesized prompt */}
                <div className="rounded-xl bg-gradient-to-br from-violet-500/10 to-cyan-500/10 border border-violet-400/20 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-violet-300 text-xs font-medium uppercase tracking-wider">
                      Synthesized Prompt
                    </p>
                    <motion.button
                      onClick={copyPrompt}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="text-xs px-3 py-1 rounded-lg bg-white/[0.06] border border-white/10 text-white/50 hover:text-white/80 transition-colors"
                    >
                      {copied ? "복사됨 ✓" : "복사"}
                    </motion.button>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed font-mono">
                    {result.synthesized_prompt}
                  </p>
                </div>

                {/* Hint */}
                <p className="text-white/15 text-xs text-center">
                  이 프롬프트를 이미지 생성 모델(Nano Banana 2 등)에 붙여넣어 브랜드 이미지를 생성하세요
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
