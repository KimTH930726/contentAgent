"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import GlassCard from "./GlassCard";
import { generatePrompt, type PromptGenerateResponse } from "@/lib/api";

interface Props {
  hasData: boolean;
  collectionName?: string;
  onPromptReady?: (prompt: string, referenceImageUrls: string[]) => void;
}

export default function PromptSynthesizer({ hasData, collectionName, onPromptReady }: Props) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [result, setResult] = useState<PromptGenerateResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
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
    setExcludedIds(new Set());
    try {
      const data = await generatePrompt(input.trim(), collectionName);
      setResult(data);
      onPromptReady?.(data.synthesized_prompt, data.reference_image_urls ?? []);
    } catch {
      // No-op
    } finally {
      setLoading(false);
    }
  };

  const toggleExclude = (imageId: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      next.has(imageId) ? next.delete(imageId) : next.add(imageId);
      return next;
    });
  };

  const handleResynthesize = async () => {
    if (!result || resyncing || excludedIds.size === 0) return;
    setResyncing(true);
    try {
      const data = await generatePrompt(
        result.user_input,
        collectionName,
        5,
        Array.from(excludedIds),
      );
      setResult(data);
      setExcludedIds(new Set());
      onPromptReady?.(data.synthesized_prompt, data.reference_image_urls ?? []);
    } catch {
      // No-op
    } finally {
      setResyncing(false);
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

                {/* I2T → RAG 파이프라인 */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-white/30 text-xs uppercase tracking-wider">
                      Image → DNA → Prompt 파이프라인
                    </p>
                    <span className="text-white/15 text-[10px]">({result.retrieved.results.length}개 참조)</span>
                  </div>

                  {result.retrieved.results.length === 0 ? (
                    <p className="text-white/20 text-xs">분석된 이미지가 없습니다. 먼저 이미지를 업로드하세요.</p>
                  ) : (
                    <div className="space-y-2">
                      {result.retrieved.results.map((r, i) => {
                        const excluded = excludedIds.has(r.image_id);
                        return (
                          <motion.div
                            key={r.image_id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: excluded ? 0.35 : 1, y: 0 }}
                            transition={{ delay: i * 0.07 }}
                            className="rounded-xl overflow-hidden transition-all"
                            style={{
                              border: excluded
                                ? "1px solid rgba(239,68,68,0.25)"
                                : "1px solid rgba(255,255,255,0.07)",
                              background: excluded
                                ? "rgba(239,68,68,0.04)"
                                : "rgba(255,255,255,0.02)",
                            }}
                          >
                            <div className="flex gap-3 p-2.5">
                              {/* 이미지 썸네일 */}
                              <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-white/10 relative">
                                {r.image_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}${r.image_url}`}
                                    alt={r.filename}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col">
                                    {r.style_dna.color_palette.slice(0, 3).map((c, ci) => (
                                      <div key={ci} className="flex-1" style={{ backgroundColor: c }} />
                                    ))}
                                  </div>
                                )}
                                {excluded && (
                                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <span className="text-red-400 text-lg font-bold">✕</span>
                                  </div>
                                )}
                              </div>

                              {/* 화살표 */}
                              <div className="flex items-center text-white/15 text-xs flex-shrink-0">→</div>

                              {/* DNA 추출 결과 */}
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-white/50 text-[10px] font-medium capitalize truncate">
                                    {r.style_dna.mood}
                                  </span>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-400/15 text-cyan-300/70 font-mono flex-shrink-0">
                                    {(r.score * 100).toFixed(0)}% 유사
                                  </span>
                                  {i === 0 && !excluded && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300/70 flex-shrink-0">
                                      1순위
                                    </span>
                                  )}
                                  {excluded && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400/70 flex-shrink-0">
                                      제외됨
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {r.style_dna.style_keywords.slice(0, 4).map((kw) => (
                                    <span key={kw} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-white/35">
                                      {kw}
                                    </span>
                                  ))}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-white/15 text-[9px]">조명:</span>
                                  <span className="text-white/35 text-[9px]">{r.style_dna.lighting}</span>
                                  <span className="text-white/10 text-[9px]">·</span>
                                  <span className="text-white/15 text-[9px]">구도:</span>
                                  <span className="text-white/35 text-[9px] truncate">{r.style_dna.composition}</span>
                                </div>
                              </div>

                              {/* 컬러 팔레트 + 제외 버튼 */}
                              <div className="flex flex-col items-end gap-1 justify-between flex-shrink-0">
                                <button
                                  onClick={() => toggleExclude(r.image_id)}
                                  className="text-[9px] px-2 py-0.5 rounded-lg transition-all"
                                  style={{
                                    background: excluded ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.05)",
                                    border: excluded ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(255,255,255,0.08)",
                                    color: excluded ? "rgba(239,68,68,0.8)" : "rgba(255,255,255,0.3)",
                                  }}
                                >
                                  {excluded ? "복원" : "제외"}
                                </button>
                                <div className="flex flex-col gap-1">
                                  {r.style_dna.color_palette.slice(0, 4).map((c, ci) => (
                                    <div key={ci} className="w-3 h-3 rounded-sm border border-white/10" style={{ backgroundColor: c }} />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}

                      {/* 재합성 버튼 */}
                      <AnimatePresence>
                        {excludedIds.size > 0 && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                          >
                            <motion.button
                              onClick={handleResynthesize}
                              disabled={resyncing}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="w-full py-2.5 rounded-xl text-xs font-medium transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                              style={{
                                background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(239,68,68,0.15))",
                                border: "1px solid rgba(124,58,237,0.3)",
                                color: "rgba(255,255,255,0.75)",
                              }}
                            >
                              {resyncing ? (
                                <>
                                  <span>재합성 중</span>
                                  {[0,1,2].map(i => (
                                    <motion.span key={i} className="inline-block w-1 h-1 rounded-full bg-violet-400"
                                      animate={{ opacity: [0.3,1,0.3] }}
                                      transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }} />
                                  ))}
                                </>
                              ) : (
                                `${excludedIds.size}개 제외하고 프롬프트 재합성 →`
                              )}
                            </motion.button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
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
