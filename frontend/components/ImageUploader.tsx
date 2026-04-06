"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "./GlassCard";
import { analyzeImage, type AnalyzeResponse } from "@/lib/api";

type Phase = "idle" | "preview" | "morphing" | "done";

interface Props {
  onAnalyzed: (result: AnalyzeResponse, previewUrl: string) => void;
}

const PARTICLE_COUNT = 24;

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
  id: i,
  x: randomBetween(-120, 120),
  y: randomBetween(-120, 120),
  size: randomBetween(2, 7),
  delay: randomBetween(0, 0.4),
  color: ["#7c3aed", "#2563eb", "#06b6d4", "#a78bfa"][i % 4],
}));

export default function ImageUploader({ onAnalyzed }: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드 가능합니다.");
      return;
    }
    setError(null);
    setPreview(URL.createObjectURL(file));
    setPhase("preview");

    // Brief preview, then start morphing + API call
    setTimeout(async () => {
      setPhase("morphing");
      try {
        const result = await analyzeImage(file);
        setTimeout(() => {
          setPhase("done");
          onAnalyzed(result, URL.createObjectURL(file));
        }, 1200);
      } catch (e) {
        setError("분석 실패. 백엔드 서버를 확인해주세요.");
        setPhase("idle");
      }
    }, 800);
  }, [onAnalyzed]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const reset = () => {
    setPhase("idle");
    setPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <GlassCard className="p-1 overflow-hidden" glow={phase === "morphing"}>
      {/* Animated gradient border on morphing */}
      <AnimatePresence>
        {phase === "morphing" && (
          <motion.div
            className="absolute inset-0 rounded-2xl z-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background:
                "conic-gradient(from 0deg, #7c3aed, #2563eb, #06b6d4, #7c3aed)",
              padding: "1px",
              borderRadius: "16px",
            }}
          >
            <motion.div
              className="absolute inset-0 rounded-2xl"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              style={{
                background:
                  "conic-gradient(from 0deg, #7c3aed, #2563eb, #06b6d4, #7c3aed)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="relative z-10 rounded-[14px] bg-[#0a0a1a] overflow-hidden"
        style={{ minHeight: 320 }}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => phase === "idle" && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onInputChange}
        />

        <AnimatePresence mode="wait">
          {/* IDLE */}
          {phase === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-80 cursor-pointer gap-4 p-8"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/30 to-cyan-500/30 border border-white/10 flex items-center justify-center"
              >
                <svg className="w-8 h-8 text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </motion.div>
              <div className="text-center">
                <p className="text-white/80 font-medium">브랜드 이미지 업로드</p>
                <p className="text-white/30 text-sm mt-1">클릭하거나 드래그하여 추가</p>
              </div>
              <div className="flex gap-2">
                {["JPG", "PNG", "WEBP"].map((ext) => (
                  <span key={ext} className="text-xs text-white/20 border border-white/10 rounded px-2 py-0.5">
                    {ext}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* PREVIEW */}
          {phase === "preview" && preview && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02, filter: "blur(4px)" }}
              className="relative h-80"
            >
              <img src={preview} alt="preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </motion.div>
          )}

          {/* MORPHING — particle burst + image dissolve */}
          {phase === "morphing" && preview && (
            <motion.div
              key="morphing"
              className="relative h-80 flex items-center justify-center overflow-hidden"
            >
              {/* Dissolving image */}
              <motion.img
                src={preview}
                alt="dissolving"
                className="absolute inset-0 w-full h-full object-cover"
                initial={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                animate={{ opacity: 0.15, scale: 1.06, filter: "blur(12px)" }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />

              {/* Particles */}
              {particles.map((p) => (
                <motion.div
                  key={p.id}
                  className="absolute rounded-full"
                  style={{
                    width: p.size,
                    height: p.size,
                    backgroundColor: p.color,
                    top: "50%",
                    left: "50%",
                  }}
                  initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                  animate={{
                    x: p.x,
                    y: p.y,
                    opacity: [0, 1, 0],
                    scale: [0, 1.5, 0],
                  }}
                  transition={{
                    duration: 1.2,
                    delay: p.delay,
                    ease: "easeOut",
                  }}
                />
              ))}

              {/* Scanning line */}
              <motion.div
                className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
                initial={{ top: "0%" }}
                animate={{ top: "100%" }}
                transition={{ duration: 1.2, ease: "linear" }}
              />

              {/* Center label */}
              <motion.div
                className="relative z-10 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-cyan-300 text-sm font-medium tracking-wider">
                  ANALYZING BRAND DNA...
                </p>
                <div className="flex gap-1 justify-center mt-2">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
                    />
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* DONE */}
          {phase === "done" && preview && (
            <motion.div
              key="done"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative h-80"
            >
              <img src={preview} alt="analyzed" className="w-full h-full object-cover opacity-50" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a1a] via-[#0a0a1a]/60 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-300 text-sm">분석 완료</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); reset(); }}
                  className="text-white/30 hover:text-white/60 text-xs transition-colors"
                >
                  새 이미지
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="absolute bottom-4 left-4 right-4 text-red-400 text-sm text-center bg-red-500/10 rounded-lg py-2">
            {error}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
