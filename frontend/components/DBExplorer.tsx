"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DBEntry {
  image_id: string;
  filename: string;
  embedding_text: string;
  style_dna: {
    color_palette: string[];
    mood: string;
    lighting: string;
    composition: string;
    style_keywords: string[];
    raw_description: string;
  };
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function PalettePreview({ colors }: { colors: string[] }) {
  return (
    <div
      className="w-full h-full"
      style={{
        background: colors.length > 1
          ? `linear-gradient(135deg, ${colors.join(", ")})`
          : colors[0] ?? "#1a1a2e",
      }}
    />
  );
}

export default function DBExplorer({ triggerRefresh }: { triggerRefresh?: number }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<DBEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<DBEntry | null>(null);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/db/entries`);
      const data = await res.json();
      setEntries(data.entries);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEntries(); }, [triggerRefresh]);
  useEffect(() => { if (open) fetchEntries(); }, [open]);

  return (
    <>
      {/* 플로팅 버튼 */}
      <motion.button
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 rounded-2xl border border-white/10 backdrop-blur-xl text-sm font-medium"
        style={{ background: "rgba(15,15,30,0.9)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
      >
        <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <ellipse cx="12" cy="5" rx="9" ry="3" strokeWidth={1.5} />
          <path strokeWidth={1.5} d="M3 5v5c0 1.657 4.03 3 9 3s9-1.343 9-3V5" />
          <path strokeWidth={1.5} d="M3 10v5c0 1.657 4.03 3 9 3s9-1.343 9-3v-5" />
        </svg>
        <span className="text-white/70">Vector DB</span>
        <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-violet-500/30 text-violet-300 border border-violet-400/20">
          {total}
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              onClick={() => { setOpen(false); setSelected(null); }}
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 bottom-0 z-50 flex"
              style={{ width: selected ? 720 : 420 }}
            >
              {/* ── 상세 패널 (선택 시) ── */}
              <AnimatePresence>
                {selected && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex-1 flex flex-col border-r border-white/[0.06] overflow-hidden"
                    style={{ background: "rgba(8,8,20,0.98)" }}
                  >
                    {/* 색상 헤더 — 팔레트로 만든 그라데이션 */}
                    <div className="relative h-40 flex-shrink-0">
                      <PalettePreview colors={selected.style_dna.color_palette} />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#08081a]" />
                      <button
                        onClick={() => setSelected(null)}
                        className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/50 hover:text-white/80 text-xs"
                      >✕</button>
                      <div className="absolute bottom-3 left-4">
                        <p className="text-white/80 font-semibold text-sm">{selected.filename}</p>
                        <p className="text-white/35 text-xs">{selected.image_id.slice(0, 8)}...</p>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                      {/* 컬러 팔레트 */}
                      <div>
                        <p className="text-white/25 text-xs uppercase tracking-wider mb-2">Color Palette</p>
                        <div className="flex gap-2">
                          {selected.style_dna.color_palette.map((c, i) => (
                            <div key={i} className="flex flex-col items-center gap-1">
                              <div className="w-9 h-9 rounded-xl border border-white/10 shadow-lg" style={{ backgroundColor: c }} />
                              <span className="text-[9px] text-white/25 font-mono">{c}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 무드/조명/구도 */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: "Mood", value: selected.style_dna.mood },
                          { label: "Lighting", value: selected.style_dna.lighting },
                          { label: "Composition", value: selected.style_dna.composition },
                        ].map((item) => (
                          <div key={item.label} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-2.5">
                            <p className="text-white/20 text-[10px] mb-1">{item.label}</p>
                            <p className="text-white/65 text-xs capitalize leading-tight">{item.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* 키워드 */}
                      <div>
                        <p className="text-white/25 text-xs uppercase tracking-wider mb-2">Keywords</p>
                        <div className="flex flex-wrap gap-1.5">
                          {selected.style_dna.style_keywords.map((kw, i) => (
                            <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-400/20 text-violet-300">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* 임베딩 텍스트 */}
                      <div>
                        <p className="text-white/25 text-xs uppercase tracking-wider mb-2">
                          Embedding Text
                          <span className="normal-case text-white/15 ml-1 text-[10px]">→ 384차원 벡터로 변환됨</span>
                        </p>
                        <div className="rounded-xl bg-cyan-500/5 border border-cyan-400/10 p-3">
                          <p className="text-cyan-300/60 text-[10px] font-mono leading-relaxed break-all">
                            {selected.embedding_text}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── 목록 패널 ── */}
              <div
                className="w-[420px] flex-shrink-0 flex flex-col"
                style={{ background: "rgba(10,10,26,0.98)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}
              >
                {/* 헤더 */}
                <div className="px-5 py-4 border-b border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <ellipse cx="12" cy="5" rx="9" ry="3" strokeWidth={1.5} />
                        <path strokeWidth={1.5} d="M3 5v5c0 1.657 4.03 3 9 3s9-1.343 9-3V5" />
                        <path strokeWidth={1.5} d="M3 10v5c0 1.657 4.03 3 9 3s9-1.343 9-3v-5" />
                      </svg>
                      <h2 className="text-white/90 font-semibold text-sm">Vector DB</h2>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 border border-violet-400/20 text-violet-300">
                        {total}개 저장됨
                      </span>
                    </div>
                    <button onClick={() => { setOpen(false); setSelected(null); }} className="text-white/30 hover:text-white/60 transition-colors">✕</button>
                  </div>
                  <p className="text-white/20 text-xs mt-1">all-MiniLM-L6-v2 · 코사인 유사도 · HNSW Index</p>
                </div>

                {/* 카드 그리드 */}
                <div className="flex-1 overflow-y-auto p-4">
                  {loading ? (
                    <div className="flex justify-center py-12">
                      <div className="flex gap-1">
                        {[0,1,2].map(i => (
                          <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-400"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }} />
                        ))}
                      </div>
                    </div>
                  ) : entries.length === 0 ? (
                    <div className="text-center py-12 text-white/20 text-sm">
                      저장된 데이터 없음<br/>
                      <span className="text-xs">이미지를 업로드하면 자동 저장됩니다</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {entries.map((entry, idx) => (
                        <motion.button
                          key={entry.image_id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => setSelected(selected?.image_id === entry.image_id ? null : entry)}
                          className="relative rounded-2xl overflow-hidden text-left transition-all"
                          style={{
                            border: selected?.image_id === entry.image_id
                              ? "1px solid rgba(124,58,237,0.6)"
                              : "1px solid rgba(255,255,255,0.07)",
                            boxShadow: selected?.image_id === entry.image_id
                              ? "0 0 20px rgba(124,58,237,0.2)"
                              : "none",
                          }}
                        >
                          {/* 컬러 그라데이션 프리뷰 */}
                          <div className="h-24 relative">
                            <PalettePreview colors={entry.style_dna.color_palette} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                            {/* 키워드 오버레이 */}
                            <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
                              {entry.style_dna.style_keywords.slice(0, 2).map((kw, i) => (
                                <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-white/70 border border-white/10">
                                  {kw}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* 하단 정보 */}
                          <div className="px-3 py-2.5 bg-white/[0.03]">
                            <p className="text-white/60 text-xs font-medium truncate">{entry.style_dna.mood}</p>
                            <p className="text-white/20 text-[10px] truncate mt-0.5">{entry.filename}</p>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="px-5 py-3 border-t border-white/[0.06] text-center">
                  <button onClick={fetchEntries} className="text-white/20 hover:text-white/40 text-xs transition-colors">
                    새로고침
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
