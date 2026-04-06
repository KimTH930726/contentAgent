"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DBEntry {
  image_id: string;
  filename: string;
  collection_name: string;
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

interface Props {
  collectionName: string;
  refreshKey?: number;
}

export default function CollectionViewer({ collectionName, refreshKey }: Props) {
  const [entries, setEntries] = useState<DBEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<DBEntry | null>(null);

  useEffect(() => {
    if (!collectionName) return;
    setLoading(true);
    fetch(`${BASE_URL}/db/entries?collection_name=${encodeURIComponent(collectionName)}`)
      .then((r) => r.json())
      .then((d) => setEntries(d.entries))
      .finally(() => setLoading(false));
  }, [collectionName, refreshKey]);

  if (!collectionName) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/60 text-sm font-medium">브랜드 DNA 라이브러리</p>
          <p className="text-white/20 text-xs">{entries.length}개 이미지 분석됨</p>
        </div>
        {loading && (
          <div className="flex gap-1">
            {[0,1,2].map(i => (
              <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-400"
                animate={{ opacity: [0.3,1,0.3] }}
                transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }} />
            ))}
          </div>
        )}
      </div>

      {!loading && entries.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/[0.06] p-8 text-center">
          <p className="text-white/20 text-sm">이 컬렉션에 이미지가 없습니다</p>
          <p className="text-white/10 text-xs mt-1">Tab 1에서 이미지를 업로드하세요</p>
        </div>
      )}

      {/* DNA 카드 그리드 */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        {entries.map((entry, idx) => (
          <motion.button
            key={entry.image_id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.04 }}
            onClick={() => setSelected(selected?.image_id === entry.image_id ? null : entry)}
            className="relative rounded-2xl overflow-hidden text-left transition-all"
            style={{
              border: selected?.image_id === entry.image_id
                ? "1px solid rgba(124,58,237,0.6)"
                : "1px solid rgba(255,255,255,0.07)",
              boxShadow: selected?.image_id === entry.image_id
                ? "0 0 24px rgba(124,58,237,0.2)"
                : "none",
            }}
          >
            {/* 컬러 그라데이션 */}
            <div className="h-20 relative" style={{
              background: entry.style_dna.color_palette.length > 1
                ? `linear-gradient(135deg, ${entry.style_dna.color_palette.join(", ")})`
                : entry.style_dna.color_palette[0] ?? "#1a1a2e",
            }}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1">
                {entry.style_dna.style_keywords.slice(0, 2).map((kw, i) => (
                  <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-white/70 border border-white/10">
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            {/* 정보 */}
            <div className="px-3 py-2.5 bg-white/[0.03]">
              <p className="text-white/65 text-xs font-medium capitalize truncate">
                {entry.style_dna.mood}
              </p>
              <p className="text-white/20 text-[10px] truncate mt-0.5">
                {entry.filename}
              </p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* 선택된 DNA 상세 */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-white/70 text-sm font-medium">{selected.filename}</p>
              <button onClick={() => setSelected(null)} className="text-white/25 hover:text-white/50 text-xs transition-colors">닫기</button>
            </div>

            {/* 컬러 팔레트 */}
            <div>
              <p className="text-white/20 text-xs uppercase tracking-wider mb-2">Color Palette</p>
              <div className="flex gap-2">
                {selected.style_dna.color_palette.map((c, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className="w-9 h-9 rounded-xl border border-white/10 shadow" style={{ backgroundColor: c }} />
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
            <div className="flex flex-wrap gap-1.5">
              {selected.style_dna.style_keywords.map((kw, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-400/20 text-violet-300">
                  {kw}
                </span>
              ))}
            </div>

            {/* 임베딩 텍스트 */}
            <div className="rounded-xl bg-cyan-500/5 border border-cyan-400/10 p-3">
              <p className="text-white/20 text-[10px] mb-1.5">Embedding Text → 384차원 벡터</p>
              <p className="text-cyan-300/50 text-[10px] font-mono leading-relaxed break-all">
                {selected.embedding_text}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
