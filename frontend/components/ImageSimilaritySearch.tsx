"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "./GlassCard";
import { searchStyles, type SearchResult } from "@/lib/api";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const QUICK_QUERIES = [
  "화사하고 밝은",
  "고급스럽고 어두운",
  "따뜻하고 아늑한",
  "청량하고 깨끗한",
  "자연스럽고 편안한",
  "모던하고 미니멀한",
];

interface Props {
  collectionName?: string;
}

export default function ImageSimilaritySearch({ collectionName }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [lastQuery, setLastQuery] = useState("");
  const [selected, setSelected] = useState<SearchResult | null>(null);

  const handleSearch = async (q?: string) => {
    const searchQ = q ?? query;
    if (!searchQ.trim() || loading) return;
    setLoading(true);
    setResults(null);
    setSelected(null);
    setLastQuery(searchQ);
    try {
      const data = await searchStyles(searchQ.trim(), 12, collectionName);
      setResults(data.results);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuick = (q: string) => {
    setQuery(q);
    handleSearch(q);
  };

  return (
    <div className="space-y-4">
      {/* 검색 입력 */}
      <GlassCard className="p-4">
        <div className="flex gap-3 items-center">
          <div className="flex-1 relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={
                collectionName
                  ? `"${collectionName}" 브랜드에서 스타일 검색... (예: 화사하고 밝은)`
                  : "스타일 검색... (예: 화사하고 밝은, 고급스러운)"
              }
              className="w-full bg-transparent text-white/80 placeholder-white/20 text-sm outline-none py-1 pr-8"
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
            onClick={() => handleSearch()}
            disabled={!query.trim() || loading}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #0891b2, #7c3aed)",
              boxShadow: "0 0 20px rgba(8,145,178,0.25)",
            }}
          >
            검색
          </motion.button>
        </div>

        {/* 빠른 검색 태그 */}
        <div className="flex flex-wrap gap-2 mt-3">
          {QUICK_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => handleQuick(q)}
              disabled={loading}
              className="text-xs px-2.5 py-1 rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/40 hover:text-white/70 hover:border-white/20 hover:bg-white/[0.06] transition-all disabled:opacity-30"
            >
              {q}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* 결과 */}
      <AnimatePresence>
        {results !== null && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-3"
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-1">
              <p className="text-white/30 text-xs">
                <span className="text-cyan-400/70">"{lastQuery}"</span>
                {collectionName && (
                  <span> · <span className="text-violet-400/70">{collectionName}</span> 브랜드</span>
                )}
                <span className="ml-1">유사 이미지 {results.length}개</span>
              </p>
              {results.length > 0 && (
                <p className="text-white/15 text-xs">클릭하면 상세 정보 확인</p>
              )}
            </div>

            {/* 컬렉션 이미지가 적을 때 안내 */}
            {results.length > 0 && results.length <= 5 && (
              <div className="px-1 flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-white/20" />
                <p className="text-white/20 text-xs">
                  컬렉션 내 이미지가 {results.length}개뿐이라 전체 표시 중 — 이미지를 더 추가하면 검색 정확도가 올라가요
                </p>
              </div>
            )}

            {results.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <p className="text-white/25 text-sm">
                  {collectionName
                    ? `"${collectionName}" 브랜드에 분석된 이미지가 없습니다.`
                    : "분석된 이미지가 없습니다. 먼저 이미지를 업로드하세요."}
                </p>
              </GlassCard>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {results.map((r, i) => (
                  <motion.div
                    key={r.image_id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setSelected(selected?.image_id === r.image_id ? null : r)}
                    className="cursor-pointer group relative rounded-2xl overflow-hidden border transition-all"
                    style={{
                      borderColor:
                        selected?.image_id === r.image_id
                          ? "rgba(6,182,212,0.5)"
                          : "rgba(255,255,255,0.07)",
                      background: "rgba(255,255,255,0.03)",
                    }}
                  >
                    {/* 이미지 썸네일 */}
                    <div className="aspect-square relative overflow-hidden bg-white/[0.04]">
                      {r.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`${BASE_URL}${r.image_url}`}
                          alt={r.filename}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        /* 이미지 없을 때 색상 팔레트로 표현 */
                        <div className="w-full h-full flex flex-col">
                          {r.style_dna.color_palette.slice(0, 4).map((c, ci) => (
                            <div
                              key={ci}
                              className="flex-1"
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      )}

                      {/* 유사도 배지 */}
                      <div
                        className="absolute top-2 right-2 px-2 py-0.5 rounded-lg text-xs font-mono font-semibold backdrop-blur-sm"
                        style={{
                          background:
                            r.score >= 0.8
                              ? "rgba(16,185,129,0.85)"
                              : r.score >= 0.6
                              ? "rgba(6,182,212,0.85)"
                              : "rgba(124,58,237,0.85)",
                          color: "white",
                        }}
                      >
                        {(r.score * 100).toFixed(0)}%
                      </div>

                      {/* 선택 오버레이 */}
                      {selected?.image_id === r.image_id && (
                        <div className="absolute inset-0 bg-cyan-500/10 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-cyan-400/90 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 카드 하단 - 키워드 + mood */}
                    <div className="p-2">
                      <p className="text-white/50 text-[10px] truncate leading-snug">
                        {r.style_dna.mood}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.style_dna.style_keywords.slice(0, 2).map((kw) => (
                          <span
                            key={kw}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/30"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* 선택된 이미지 상세 패널 */}
            <AnimatePresence>
              {selected && (
                <motion.div
                  initial={{ opacity: 0, y: 8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -4, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div
                    className="rounded-2xl border p-4 space-y-3"
                    style={{
                      borderColor: "rgba(6,182,212,0.25)",
                      background: "rgba(6,182,212,0.04)",
                    }}
                  >
                    <div className="flex items-start gap-4">
                      {/* 큰 썸네일 */}
                      <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 border border-white/10">
                        {selected.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`${BASE_URL}${selected.image_url}`}
                            alt={selected.filename}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col">
                            {selected.style_dna.color_palette.slice(0, 4).map((c, ci) => (
                              <div key={ci} className="flex-1" style={{ backgroundColor: c }} />
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 상세 DNA 정보 */}
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-cyan-300/80 text-sm font-medium truncate">
                            {selected.filename}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-lg font-mono flex-shrink-0"
                            style={{
                              background:
                                selected.score >= 0.8
                                  ? "rgba(16,185,129,0.2)"
                                  : "rgba(6,182,212,0.2)",
                              color:
                                selected.score >= 0.8 ? "#10b981" : "#06b6d4",
                            }}
                          >
                            유사도 {(selected.score * 100).toFixed(1)}%
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-white/25 uppercase tracking-wider text-[9px]">Mood</span>
                            <p className="text-white/65 mt-0.5">{selected.style_dna.mood}</p>
                          </div>
                          <div>
                            <span className="text-white/25 uppercase tracking-wider text-[9px]">Lighting</span>
                            <p className="text-white/65 mt-0.5">{selected.style_dna.lighting}</p>
                          </div>
                          <div className="col-span-2">
                            <span className="text-white/25 uppercase tracking-wider text-[9px]">Composition</span>
                            <p className="text-white/65 mt-0.5">{selected.style_dna.composition}</p>
                          </div>
                        </div>

                        {/* 컬러 팔레트 */}
                        <div>
                          <span className="text-white/25 uppercase tracking-wider text-[9px]">Color Palette</span>
                          <div className="flex gap-1.5 mt-1">
                            {selected.style_dna.color_palette.map((c, ci) => (
                              <div
                                key={ci}
                                title={c}
                                className="w-5 h-5 rounded-md border border-white/10 flex-shrink-0"
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>

                        {/* 스타일 키워드 */}
                        <div className="flex flex-wrap gap-1">
                          {selected.style_dna.style_keywords.map((kw) => (
                            <span
                              key={kw}
                              className="text-[10px] px-2 py-0.5 rounded-lg border border-cyan-400/20 bg-cyan-400/5 text-cyan-300/60"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* raw description */}
                    {selected.style_dna.raw_description && (
                      <p className="text-white/30 text-xs leading-relaxed border-t border-white/[0.06] pt-3">
                        {selected.style_dna.raw_description}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
