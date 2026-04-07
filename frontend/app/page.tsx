"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import CollectionManager from "@/components/CollectionManager";
import MultiImageUploader from "@/components/MultiImageUploader";
import StyleDNACard from "@/components/StyleDNACard";
import CollectionViewer from "@/components/CollectionViewer";
import PromptSynthesizer from "@/components/PromptSynthesizer";
import GeneratedImageCard from "@/components/GeneratedImageCard";
import QualityTestPanel from "@/components/QualityTestPanel";
import AgentTimeline from "@/components/AgentTimeline";
import ImageSimilaritySearch from "@/components/ImageSimilaritySearch";
import type { AgentStep } from "@/components/AgentTimeline";
import type { AnalyzeResponse, GenerateResponse, QualityCompareResponse } from "@/lib/api";
import { generateImage } from "@/lib/api";

type Tab = "build" | "search" | "generate";

const TABS: { id: Tab; label: string; sub: string }[] = [
  { id: "build",    label: "브랜드 구축",   sub: "컬렉션 생성 + 이미지 업로드" },
  { id: "search",   label: "이미지 검색",   sub: "스타일 유사도 검색 + 검수" },
  { id: "generate", label: "콘텐츠 생성",   sub: "브랜드 DNA 확인 + 프롬프트 생성" },
];

export default function Home() {
  const [tab, setTab] = useState<Tab>("build");

  // 공유 상태
  const [selectedCollection, setSelectedCollection] = useState<string>("");
  const [dbRefresh, setDbRefresh] = useState(0);

  // Tab 1 상태
  const [latestAnalyze, setLatestAnalyze] = useState<AnalyzeResponse | null>(null);

  // Tab 2 상태
  const [synthesizedPrompt, setSynthesizedPrompt] = useState<string | null>(null);
  const [referenceImageUrls, setReferenceImageUrls] = useState<string[]>([]);
  const [generateResult, setGenerateResult]   = useState<GenerateResponse | null>(null);
  const [qualityResult, setQualityResult]     = useState<QualityCompareResponse | null>(null);
  const [latestPreviewUrl, setLatestPreviewUrl] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps]   = useState<AgentStep[]>([]);
  const [activeStep, setActiveStep]           = useState<AgentStep | null>(null);

  // ── helpers ──────────────────────────────────────────────────────────────
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

  const selectCollection = (name: string) => {
    setSelectedCollection(name);
    setLatestAnalyze(null);
    setSynthesizedPrompt(null);
    setGenerateResult(null);
    setQualityResult(null);
    setCompletedSteps([]);
  };

  // ── Tab 1 handlers ────────────────────────────────────────────────────────
  const handleAllDone = async (
    results: Array<{ result: AnalyzeResponse; previewUrl: string }>
  ) => {
    if (!results.length) return;
    const last = results[results.length - 1];
    setLatestAnalyze(last.result);
    setLatestPreviewUrl(last.previewUrl);
    setDbRefresh((n) => n + 1);
  };

  // ── Tab 2 handlers ────────────────────────────────────────────────────────
  const handlePromptReady = async (prompt: string, refUrls: string[]) => {
    setSynthesizedPrompt(prompt);
    setReferenceImageUrls(refUrls);
    await pushStep("rag_search");
    await pushStep("prompt_ready", 200);
  };

  const handleGenerateImage = async () => {
    if (!synthesizedPrompt) return;
    setGenerateResult(null);
    setQualityResult(null);
    await pushStep("generating");
    const result = await generateImage(
      synthesizedPrompt,
      latestAnalyze?.style_dna,
      referenceImageUrls,
    );
    setGenerateResult(result);
  };

  const handleQualityResult = async (result: QualityCompareResponse) => {
    await pushStep("quality_test");
    setQualityResult(result);
    await pushStep("complete", 300);
  };

  const hasCollectionData = !!selectedCollection;

  return (
    <div className="min-h-screen">
      {/* ── Top Bar ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] backdrop-blur-xl"
        style={{ background: "rgba(10,10,26,0.85)" }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shadow-[0_0_16px_rgba(124,58,237,0.4)]">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-white/80 font-semibold text-sm">Brand Content Agent</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-400/20 text-violet-300 hidden sm:block">
              PoC v0.1
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl border border-white/[0.07] bg-white/[0.03]">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="relative px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ color: tab === t.id ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.3)" }}
              >
                {tab === t.id && (
                  <motion.div
                    layoutId="tab-bg"
                    className="absolute inset-0 rounded-lg"
                    style={{ background: "rgba(124,58,237,0.25)", border: "1px solid rgba(124,58,237,0.35)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Active collection badge */}
          <div className="flex-shrink-0">
            {selectedCollection ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-400/20">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                <span className="text-violet-300 text-xs font-medium max-w-[120px] truncate">
                  {selectedCollection}
                </span>
              </div>
            ) : (
              <span className="text-white/20 text-xs">컬렉션 미선택</span>
            )}
          </div>
        </div>
      </header>

      {/* ── Tab Content ──────────────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">

          {/* ════════════════════════════════════════════════════════
              TAB 1 — 브랜드 구축
          ════════════════════════════════════════════════════════ */}
          {tab === "build" && (
            <motion.div
              key="build"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5"
            >
              {/* 컬렉션 관리 */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 h-fit">
                <CollectionManager
                  selectedCollection={selectedCollection}
                  onSelect={selectCollection}
                  onCollectionsChange={() => setDbRefresh((n) => n + 1)}
                />
              </div>

              {/* 업로드 + DNA 결과 */}
              <div className="space-y-5">
                {!selectedCollection ? (
                  <div className="rounded-2xl border border-dashed border-white/[0.06] p-12 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-400/15 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-7 h-7 text-violet-400/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <p className="text-white/30 text-sm">좌측에서 브랜드 컬렉션을 먼저 선택하세요</p>
                    <p className="text-white/15 text-xs mt-1">새 컬렉션을 만들거나 기존 컬렉션을 선택해주세요</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
                    <div className="flex items-center gap-2 mb-5">
                      <div className="w-2 h-2 rounded-full bg-violet-400" />
                      <p className="text-white/70 text-sm font-medium">{selectedCollection}</p>
                      <span className="text-white/25 text-xs">에 이미지 추가</span>
                    </div>
                    <MultiImageUploader
                      collectionName={selectedCollection}
                      onAllDone={handleAllDone}
                    />
                  </div>
                )}

                {/* 최신 분석 DNA */}
                <AnimatePresence>
                  {latestAnalyze && (
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <p className="text-white/40 text-xs">가장 최근 분석 결과</p>
                      </div>
                      <StyleDNACard data={latestAnalyze} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 완료 안내 */}
                {latestAnalyze && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-2xl bg-violet-500/8 border border-violet-400/15 p-4 flex items-center justify-between"
                  >
                    <p className="text-violet-300/70 text-sm">
                      이미지 저장 완료! 이제 콘텐츠를 생성해보세요.
                    </p>
                    <button
                      onClick={() => setTab("generate")}
                      className="text-xs px-3 py-1.5 rounded-lg bg-violet-500/20 border border-violet-400/25 text-violet-300 hover:bg-violet-500/30 transition-colors"
                    >
                      콘텐츠 생성 →
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════
              TAB 2 — 이미지 검색
          ════════════════════════════════════════════════════════ */}
          {tab === "search" && (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              {/* 브랜드 선택 바 */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                <p className="text-white/30 text-xs mb-3 uppercase tracking-wider">브랜드 선택 (선택 시 해당 브랜드 내에서만 검색)</p>
                <CollectionManager
                  selectedCollection={selectedCollection}
                  onSelect={selectCollection}
                  onCollectionsChange={() => setDbRefresh((n) => n + 1)}
                />
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-cyan-400" />
                  <p className="text-white/70 text-sm font-medium">
                    {selectedCollection
                      ? `"${selectedCollection}" 브랜드 내 스타일 검색`
                      : "전체 브랜드 스타일 검색"}
                  </p>
                  {!selectedCollection && (
                    <span className="text-white/25 text-xs">— 브랜드 선택 시 해당 브랜드로 범위 한정</span>
                  )}
                </div>
                <ImageSimilaritySearch collectionName={selectedCollection || undefined} />
              </div>
            </motion.div>
          )}

          {/* ════════════════════════════════════════════════════════
              TAB 3 — 콘텐츠 생성
          ════════════════════════════════════════════════════════ */}
          {tab === "generate" && (
            <motion.div
              key="generate"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              {/* 브랜드 선택 바 */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
                <p className="text-white/30 text-xs mb-3 uppercase tracking-wider">브랜드 선택</p>
                <CollectionManager
                  selectedCollection={selectedCollection}
                  onSelect={selectCollection}
                  onCollectionsChange={() => setDbRefresh((n) => n + 1)}
                />
              </div>

              {!selectedCollection ? (
                <div className="rounded-2xl border border-dashed border-white/[0.06] p-12 text-center">
                  <p className="text-white/25 text-sm">브랜드 컬렉션을 선택해주세요</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-5">

                  {/* 왼쪽: DNA 갤러리 */}
                  <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
                    <CollectionViewer
                      collectionName={selectedCollection}
                      refreshKey={dbRefresh}
                    />
                  </div>

                  {/* 오른쪽: 프롬프트 합성 + 생성 */}
                  <div className="space-y-4">
                    {/* Agent Timeline */}
                    <AnimatePresence>
                      {(completedSteps.length > 0 || activeStep) && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
                        >
                          <AgentTimeline completedSteps={completedSteps} activeStep={activeStep} />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* 프롬프트 합성 */}
                    <PromptSynthesizer
                      hasData={hasCollectionData}
                      collectionName={selectedCollection}
                      onPromptReady={handlePromptReady}
                    />

                    {/* 이미지 생성 버튼 */}
                    <AnimatePresence>
                      {synthesizedPrompt && !generateResult && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                          <motion.button
                            onClick={handleGenerateImage}
                            whileHover={{ scale: 1.02, boxShadow: "0 0 40px rgba(124,58,237,0.4)" }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full py-4 rounded-2xl text-sm font-semibold tracking-wide"
                            style={{
                              background: "linear-gradient(135deg, #7c3aed 0%, #2563eb 50%, #06b6d4 100%)",
                              boxShadow: "0 0 24px rgba(124,58,237,0.3)",
                            }}
                          >
                            "{selectedCollection}" 브랜드 이미지 생성 →
                          </motion.button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* T2I 결과 */}
                    <AnimatePresence>
                      {generateResult && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                          <GeneratedImageCard
                            data={generateResult}
                            originalImageId={latestAnalyze?.image_id ?? ""}
                            styleDna={latestAnalyze?.style_dna}
                            onQualityResult={handleQualityResult}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Quality Test */}
                    <AnimatePresence>
                      {qualityResult && latestPreviewUrl && generateResult && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                          <QualityTestPanel
                            result={qualityResult}
                            originalPreviewUrl={latestPreviewUrl}
                            generatedBase64={generateResult.image_base64}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
