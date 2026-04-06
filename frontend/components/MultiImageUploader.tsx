"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { analyzeImage, type AnalyzeResponse } from "@/lib/api";

interface UploadItem {
  id: string;
  file: File;
  previewUrl: string;
  status: "pending" | "analyzing" | "done" | "error";
  result?: AnalyzeResponse;
}

interface Props {
  collectionName: string;
  onAllDone: (results: Array<{ result: AnalyzeResponse; previewUrl: string }>) => void;
}

export default function MultiImageUploader({ collectionName, onAllDone }: Props) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [running, setRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((files: File[]) => {
    const images = files.filter((f) => f.type.startsWith("image/"));
    const newItems: UploadItem[] = images.map((f) => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      previewUrl: URL.createObjectURL(f),
      status: "pending",
    }));
    setItems((prev) => [...prev, ...newItems]);
  }, []);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    addFiles(Array.from(e.dataTransfer.files));
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const runAnalysis = async () => {
    const pending = items.filter((i) => i.status === "pending");
    if (!pending.length || !collectionName) return;
    setRunning(true);

    const done: Array<{ result: AnalyzeResponse; previewUrl: string }> = [];

    for (const item of pending) {
      setItems((prev) =>
        prev.map((i) => i.id === item.id ? { ...i, status: "analyzing" } : i)
      );
      try {
        const result = await analyzeImage(item.file, collectionName);
        setItems((prev) =>
          prev.map((i) => i.id === item.id ? { ...i, status: "done", result } : i)
        );
        done.push({ result, previewUrl: item.previewUrl });
      } catch {
        setItems((prev) =>
          prev.map((i) => i.id === item.id ? { ...i, status: "error" } : i)
        );
      }
    }

    setRunning(false);
    if (done.length > 0) onAllDone(done);
  };

  const pendingCount = items.filter((i) => i.status === "pending").length;
  const doneCount = items.filter((i) => i.status === "done").length;

  return (
    <div className="space-y-3">
      {/* 드롭존 */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center cursor-pointer hover:border-violet-400/30 hover:bg-violet-500/5 transition-all"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onInputChange}
        />
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-400/20 flex items-center justify-center mx-auto mb-3"
        >
          <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 4v16m8-8H4" />
          </svg>
        </motion.div>
        <p className="text-white/50 text-sm">이미지 추가</p>
        <p className="text-white/20 text-xs mt-1">여러 장 동시 선택 가능 · JPG, PNG, WEBP</p>
      </div>

      {/* 이미지 그리드 */}
      <AnimatePresence>
        {items.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-3 gap-2"
          >
            {items.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative rounded-xl overflow-hidden aspect-square group"
              >
                <img src={item.previewUrl} alt="" className="w-full h-full object-cover" />

                {/* 상태 오버레이 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  {item.status === "analyzing" && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {item.status === "done" && (
                    <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                      <span className="text-emerald-300 text-lg">✓</span>
                    </div>
                  )}
                  {item.status === "error" && (
                    <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                      <span className="text-red-300 text-lg">✗</span>
                    </div>
                  )}
                </div>

                {/* 삭제 버튼 */}
                {item.status === "pending" && (
                  <button
                    onClick={() => removeItem(item.id)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white/60 text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  >
                    ✕
                  </button>
                )}

                {/* 파일명 */}
                <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-gradient-to-t from-black/60 to-transparent">
                  <p className="text-white/50 text-[9px] truncate">{item.file.name}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 분석 버튼 */}
      {pendingCount > 0 && (
        <motion.button
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={runAnalysis}
          disabled={running || !collectionName}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full py-3 rounded-xl text-sm font-medium disabled:opacity-40 transition-all"
          style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)", boxShadow: "0 0 20px rgba(124,58,237,0.3)" }}
        >
          {running ? (
            <span className="flex items-center justify-center gap-2">
              분석 중...
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span key={i} className="inline-block w-1 h-1 rounded-full bg-white/60"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }} />
                ))}
              </span>
            </span>
          ) : (
            `${pendingCount}장 분석 → "${collectionName}" 저장`
          )}
        </motion.button>
      )}

      {/* 완료 요약 */}
      {doneCount > 0 && pendingCount === 0 && !running && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl bg-emerald-500/10 border border-emerald-400/20 px-4 py-3 flex items-center justify-between"
        >
          <span className="text-emerald-300 text-sm">✓ {doneCount}장 분석 완료 · "{collectionName}" 저장됨</span>
          <button
            onClick={() => setItems([])}
            className="text-white/25 hover:text-white/50 text-xs transition-colors"
          >
            초기화
          </button>
        </motion.div>
      )}
    </div>
  );
}
