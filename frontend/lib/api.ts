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
}

export interface PromptGenerateResponse {
  user_input: string;
  translated_query: string;
  retrieved: { query: string; results: SearchResult[] };
  synthesized_prompt: string;
}

export async function analyzeImage(file: File): Promise<AnalyzeResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE_URL}/analyze`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export interface GenerateResponse {
  generation_id: string;
  prompt_used: string;
  image_base64: string;
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

export async function generateImage(
  synthesizedPrompt: string,
  styleDna?: StyleDNA
): Promise<GenerateResponse> {
  const res = await fetch(`${BASE_URL}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ synthesized_prompt: synthesizedPrompt, style_dna: styleDna ?? null }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function compareQuality(
  originalImageId: string,
  generatedImageBase64: string
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

export async function generatePrompt(
  userInput: string,
  topK = 5
): Promise<PromptGenerateResponse> {
  const res = await fetch(`${BASE_URL}/prompt/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_input: userInput, top_k: topK }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
