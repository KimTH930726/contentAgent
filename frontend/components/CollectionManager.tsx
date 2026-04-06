"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { listCollections, createCollection, deleteCollection, type CollectionInfo } from "@/lib/api";

interface Props {
  selectedCollection: string | null;
  onSelect: (name: string) => void;
  onCollectionsChange?: () => void;
}

function PaletteBar({ colors }: { colors: string[] }) {
  if (!colors.length) {
    return <div className="h-1.5 rounded-full bg-white/[0.06] w-full" />;
  }
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden w-full">
      {colors.map((c, i) => (
        <div key={i} className="flex-1" style={{ backgroundColor: c }} />
      ))}
    </div>
  );
}

export default function CollectionManager({ selectedCollection, onSelect, onCollectionsChange }: Props) {
  const [collections, setCollections] = useState<CollectionInfo[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const data = await listCollections();
    setCollections(data);
    onCollectionsChange?.();
  }, [onCollectionsChange]);

  useEffect(() => { refresh(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    try {
      await createCollection(newName.trim(), newDesc.trim());
      onSelect(newName.trim());
      setNewName(""); setNewDesc(""); setCreating(false);
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`"${name}" 컬렉션을 삭제할까요? 저장된 이미지 DNA도 모두 삭제됩니다.`)) return;
    await deleteCollection(name);
    if (selectedCollection === name) onSelect("");
    await refresh();
  };

  return (
    <div className="space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white/80 font-semibold text-sm">브랜드 컬렉션</h2>
          <p className="text-white/25 text-xs mt-0.5">컬렉션 선택 후 이미지를 업로드하세요</p>
        </div>
        <motion.button
          onClick={() => setCreating(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-violet-400/30 text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 transition-colors"
        >
          <span className="text-base leading-none">+</span> 새 컬렉션
        </motion.button>
      </div>

      {/* 새 컬렉션 폼 */}
      <AnimatePresence>
        {creating && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreate}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-violet-400/20 bg-violet-500/5 p-4 space-y-3">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="브랜드명 (예: Nike SS2024)"
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-sm text-white/80 placeholder-white/20 outline-none focus:border-violet-400/40"
              />
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="설명 (선택)"
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 text-sm text-white/60 placeholder-white/15 outline-none focus:border-violet-400/40"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={!newName.trim() || loading}
                  className="flex-1 py-2 rounded-xl text-sm font-medium disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}
                >
                  생성
                </button>
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="px-4 py-2 rounded-xl text-sm text-white/40 border border-white/10 hover:text-white/60 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* 컬렉션 목록 */}
      <div className="space-y-2">
        {collections.length === 0 && !creating && (
          <p className="text-white/20 text-xs text-center py-4">
            컬렉션이 없습니다. 새 컬렉션을 만들어보세요.
          </p>
        )}
        <AnimatePresence>
          {collections.map((col, i) => {
            const isSelected = selectedCollection === col.name;
            return (
              <motion.div
                key={col.name}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onSelect(col.name)}
                className="group relative rounded-2xl p-4 cursor-pointer transition-all"
                style={{
                  background: isSelected ? "rgba(124,58,237,0.12)" : "rgba(255,255,255,0.03)",
                  border: isSelected
                    ? "1px solid rgba(124,58,237,0.5)"
                    : "1px solid rgba(255,255,255,0.07)",
                  boxShadow: isSelected ? "0 0 20px rgba(124,58,237,0.15)" : "none",
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <motion.div
                        layoutId="selected-dot"
                        className="w-2 h-2 rounded-full bg-violet-400"
                      />
                    )}
                    <span className={`text-sm font-medium ${isSelected ? "text-white/90" : "text-white/60"}`}>
                      {col.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/25">
                      {col.entry_count}장
                    </span>
                    <button
                      onClick={(e) => handleDelete(col.name, e)}
                      className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all text-xs"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                {col.description && (
                  <p className="text-white/25 text-xs mb-2">{col.description}</p>
                )}

                <PaletteBar colors={col.preview_colors} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
