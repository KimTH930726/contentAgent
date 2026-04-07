const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface StyleDNA {
  color_palette: string[];
  mood: string;
  composition: string;
  lighting: string;
  style_keywords: string[];
  raw_description: string;
}

export interface AnalyzeResponse {
  image_id: string;
  filename: string;
  style_dna: StyleDNA;
  stored: boolean;
}

export interface SearchResult {
  image_id: string;
  filename: string;
  score: number;
  style_dna: StyleDNA;
  image_url?: string;
}

export interface PromptGenerateResponse {
  user_input: string;
  translated_query: string;
  retrieved: { query: string; results: SearchResult[] };
  synthesized_prompt: string;
  reference_image_urls: string[];
}

export interface GenerateResponse {
  generation_id: string;
  prompt_used: string;
  image_base64: string;
  reference_image_urls?: string[];
}

export interface QualityScore {
  overall: number;
  color_match: number;
  style_match: number;
  composition_match: number;
  feedback: string;
}

export interface QualityCompareResponse {
  quality_score: QualityScore;
  passed: boolean;
}

export interface CollectionInfo {
  name: string;
  description: string;
  entry_count: number;
  preview_colors: string[];
}

// ── Collections ──────────────────────────────────────────────────────────────

export async function listCollections(): Promise<CollectionInfo[]> {
  const res = await fetch(`${BASE_URL}/collections`);
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.collections;
}

export async function createCollection(name: string, description = ""): Promise<CollectionInfo> {
  const res = await fetch(`${BASE_URL}/collections`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteCollection(name: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/collections/${encodeURIComponent(name)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function deleteDBEntry(imageId: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/db/entries/${encodeURIComponent(imageId)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await res.text());
}

// ── Analyze ───────────────────────────────────────────────────────────────────

export async function analyzeImage(
  file: File,
  collectionName = "default",
): Promise<AnalyzeResponse> {
  const form = new FormData();
  form.append("file", file);
  form.append("collection_name", collectionName);
  const res = await fetch(`${BASE_URL}/analyze`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Search ────────────────────────────────────────────────────────────────────

export interface SearchResponse {
  query: string;
  results: SearchResult[];
}

export async function searchStyles(
  query: string,
  topK = 10,
  collectionName?: string,
): Promise<SearchResponse> {
  const res = await fetch(`${BASE_URL}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      top_k: topK,
      collection_name: collectionName ?? null,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Prompt ────────────────────────────────────────────────────────────────────

export async function generatePrompt(
  userInput: string,
  collectionName?: string,
  topK = 5,
  excludeIds: string[] = [],
): Promise<PromptGenerateResponse> {
  const res = await fetch(`${BASE_URL}/prompt/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_input: userInput,
      top_k: topK,
      collection_name: collectionName ?? null,
      exclude_ids: excludeIds,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Generate ──────────────────────────────────────────────────────────────────

export async function generateImage(
  synthesizedPrompt: string,
  styleDna?: StyleDNA,
  referenceImageUrls?: string[],
): Promise<GenerateResponse> {
  const res = await fetch(`${BASE_URL}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      synthesized_prompt: synthesizedPrompt,
      style_dna: styleDna ?? null,
      reference_image_urls: referenceImageUrls ?? [],
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Quality ───────────────────────────────────────────────────────────────────

export async function compareQuality(
  originalImageId: string,
  generatedImageBase64: string,
): Promise<QualityCompareResponse> {
  const res = await fetch(`${BASE_URL}/quality/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      original_image_id: originalImageId,
      generated_image_base64: generatedImageBase64,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
