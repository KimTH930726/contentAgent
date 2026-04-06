"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ImageUploader from "@/components/ImageUploader";
import StyleDNACard from "@/components/StyleDNACard";
import PromptSynthesizer from "@/components/PromptSynthesizer";
import GeneratedImageCard from "@/components/GeneratedImageCard";
import QualityTestPanel from "@/components/QualityTestPanel";
import AgentTimeline from "@/components/AgentTimeline";
import DBExplorer from "@/components/DBExplorer";
import type { AgentStep } from "@/components/AgentTimeline";
import type {
  AnalyzeResponse,
  GenerateResponse,
  QualityCompareResponse,
} from "@/lib/api";
import { generateImage } from "@/lib/api";

export default function Home() {
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResponse | null>(null);
  const [dbRefresh, setDbRefresh] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [synthesizedPrompt, setSynthesizedPrompt] = useState<string | null>(null);
  const [generateResult, setGenerateResult] = useState<GenerateResponse | null>(null);
  const [qualityResult, setQualityResult] = useState<QualityCompareResponse | null>(null);

  const [completedSteps, setCompletedSteps] = useState<AgentStep[]>([]);
  const [activeStep, setActiveStep] = useState<AgentStep | null>(null);

  const pushStep = (step: AgentStep, delayMs = 0) =>
    new Promise<void>((resolve) => {
      setTimeout(() => {
        setActiveStep(step);
        setTimeout(() => {
          setCompletedSteps((prev) => prev.includes(step) ? prev : [...prev, step]);
          setActiveStep(null);
          resolve();
        }, 600);
      }, delayMs);
    });

  const handleAnalyzed = async (result: AnalyzeResponse, url: string) => {
    setAnalyzeResult(result);
    setPreviewUrl(url);
    setDbRefresh((n) => n + 1);
    await pushStep("upload");
    await pushStep("analyzing", 100);
    await pushStep("dna_extracted", 100);
  };

  const handlePromptReady = async (prompt: string) => {
    setSynthesizedPrompt(prompt);
    await pushStep("rag_search");
    await pushStep("prompt_ready", 200);
  };

  const handleGenerateImage = async () => {
    if (!synthesizedPrompt || !analyzeResult) return;
    setGenerateResult(null);
    setQualityResult(null);

    await pushStep("generating");

    const result = await generateImage(synthesizedPrompt, analyzeResult.style_dna);
    setGenerateResult(result);
  };

  const handleQualityResult = async (result: QualityCompareResponse) => {
    await pushStep("quality_test");
    setQualityResult(result);
    await pushStep("complete", 300);
  };

  const hasData = analyzeResult !== null;

  return (
    <main className="min-h-screen px-4 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mb-10 flex items-start justify-between"
      >
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.4)]">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-white/90 font-semibold text-lg tracking-tight">Brand Content Agent</h1>
          </div>
          <p className="text-white/20 text-sm pl-11">
            I2T → Brand RAG → T2I → Reverse Quality Test
          </p>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-400/20 text-violet-300 mt-1">
          PoC v0.1
        </span>
      </motion.header>

      {/* 3-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-5">

        {/* ── Col 1: Upload + DNA ── */}
        <div className="space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <ImageUploader onAnalyzed={handleAnalyzed} />
          </motion.div>

          <AnimatePresence>
            {analyzeResult && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <StyleDNACard data={analyzeResult} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Col 2: Agent Timeline + Prompt + Generate button ── */}
        <div className="space-y-5">
          {/* Agent timeline */}
          <AnimatePresence>
            {(completedSteps.length > 0 || activeStep) && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5"
              >
                <AgentTimeline completedSteps={completedSteps} activeStep={activeStep} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Prompt synthesizer */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <PromptSynthesizer hasData={hasData} onPromptReady={handlePromptReady} />
          </motion.div>

          {/* Generate image button */}
          <AnimatePresence>
            {synthesizedPrompt && !generateResult && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <motion.button
                  onClick={handleGenerateImage}
                  whileHover={{ scale: 1.02, boxShadow: "0 0 40px rgba(124,58,237,0.4)" }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 rounded-2xl text-base font-semibold tracking-wide"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed 0%, #2563eb 50%, #06b6d4 100%)",
                    boxShadow: "0 0 24px rgba(124,58,237,0.3)",
                  }}
                >
                  이미지 생성하기 →
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty state pipeline hint */}
          {!hasData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="rounded-2xl border border-white/[0.04] p-5"
            >
              <p className="text-white/20 text-xs uppercase tracking-wider mb-4">Pipeline</p>
              <div className="space-y-2">
                {[
                  { icon: "🖼", label: "Brand Image Upload", sub: "I2T" },
                  { icon: "👁", label: "Vision Analysis", sub: "Gemini Flash" },
                  { icon: "🧬", label: "Style DNA → ChromaDB", sub: "RAG" },
                  { icon: "✨", label: "Prompt Synthesis", sub: "RAG + LLM" },
                  { icon: "🎨", label: "Image Generation", sub: "T2I" },
                  { icon: "🔬", label: "Reverse Quality Test", sub: "I2T compare" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-white/20">
                    <span className="text-sm">{item.icon}</span>
                    <span className="text-xs flex-1">{item.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06]">
                      {item.sub}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* ── Col 3: T2I result + Quality Test ── */}
        <div className="space-y-5">
          <AnimatePresence>
            {generateResult && analyzeResult && previewUrl && (
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <GeneratedImageCard
                  data={generateResult}
                  originalImageId={analyzeResult.image_id}
                  styleDna={analyzeResult.style_dna}
                  onQualityResult={handleQualityResult}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {qualityResult && previewUrl && generateResult && (
              <motion.div
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <QualityTestPanel
                  result={qualityResult}
                  originalPreviewUrl={previewUrl}
                  generatedBase64={generateResult.image_base64}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <DBExplorer triggerRefresh={dbRefresh} />

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="text-center text-white/10 text-xs mt-12"
      >
        Brand Content Agent · PoC · LLM mock mode
      </motion.p>
    </main>
  );
}
