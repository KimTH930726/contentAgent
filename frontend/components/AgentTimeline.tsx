"use client";

import { motion, AnimatePresence } from "framer-motion";

export type AgentStep =
  | "upload"
  | "analyzing"
  | "dna_extracted"
  | "rag_search"
  | "prompt_ready"
  | "generating"
  | "quality_test"
  | "complete";

interface StepConfig {
  label: string;
  sublabel: string;
  color: string;
}

const STEP_CONFIG: Record<AgentStep, StepConfig> = {
  upload:          { label: "이미지 수신",         sublabel: "브랜드 에셋 파이프라인 진입",       color: "bg-white/30" },
  analyzing:       { label: "비전 분석 중",         sublabel: "색상·질감·구도·분위기 추출",        color: "bg-cyan-400" },
  dna_extracted:   { label: "스타일 DNA 저장",      sublabel: "ChromaDB 벡터 임베딩 완료",         color: "bg-violet-400" },
  rag_search:      { label: "RAG 검색",             sublabel: "브랜드 표준 프롬프트 조각 검색",    color: "bg-blue-400" },
  prompt_ready:    { label: "프롬프트 합성 완료",   sublabel: "T2I 입력 프롬프트 준비",            color: "bg-indigo-400" },
  generating:      { label: "이미지 생성 중",       sublabel: "T2I 모델 실행",                     color: "bg-pink-400" },
  quality_test:    { label: "품질 검증 중",         sublabel: "Reverse Quality Test 실행",         color: "bg-amber-400" },
  complete:        { label: "파이프라인 완료",       sublabel: "브랜드 이미지 생성 성공",           color: "bg-emerald-400" },
};

const ORDERED: AgentStep[] = [
  "upload", "analyzing", "dna_extracted",
  "rag_search", "prompt_ready",
  "generating", "quality_test", "complete",
];

interface Props {
  completedSteps: AgentStep[];
  activeStep: AgentStep | null;
}

export default function AgentTimeline({ completedSteps, activeStep }: Props) {
  const visibleSteps = ORDERED.filter(
    (s) => completedSteps.includes(s) || s === activeStep
  );

  if (visibleSteps.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-white/20 text-xs uppercase tracking-wider mb-3">Agent Log</p>
      <AnimatePresence>
        {visibleSteps.map((step, i) => {
          const cfg = STEP_CONFIG[step];
          const isActive = step === activeStep;
          const isDone = completedSteps.includes(step);

          return (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: i * 0.04, ease: "easeOut" }}
              className="flex items-start gap-3"
            >
              <div className="flex flex-col items-center pt-1 flex-shrink-0">
                <div className="relative">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${cfg.color} ${
                      isActive ? "animate-pulse" : ""
                    } ${isDone ? "opacity-100" : "opacity-60"}`}
                  />
                  {isActive && (
                    <motion.div
                      className={`absolute inset-0 rounded-full ${cfg.color}`}
                      initial={{ scale: 1, opacity: 0.6 }}
                      animate={{ scale: 2.5, opacity: 0 }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}
                </div>
                {i < visibleSteps.length - 1 && (
                  <div className="w-px h-6 bg-white/[0.06] mt-1" />
                )}
              </div>

              <div className="pb-4">
                <p className={`text-sm font-medium ${isDone ? "text-white/80" : "text-white/40"}`}>
                  {cfg.label}
                </p>
                <p className="text-white/25 text-xs">{cfg.sublabel}</p>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
