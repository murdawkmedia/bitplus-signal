export const OPEN_SOURCE_MODELS = [
  {
    id: "z-ai/glm-5.1",
    label: "GLM 5.1",
    role: "default hackathon enrichment and draft refinement"
  },
  {
    id: "moonshotai/kimi-k2.6",
    label: "Kimi K2.6",
    role: "alternate open-source drafting and classification"
  },
  {
    id: "z-ai/glm-5.2",
    label: "GLM 5.2",
    role: "long-context agentic review when credits allow"
  },
  {
    id: "z-ai/glm-5-turbo",
    label: "GLM 5 Turbo",
    role: "faster inexpensive fallback"
  }
] as const;

export const DEFAULT_OPENROUTER_MODEL = OPEN_SOURCE_MODELS[0].id;

interface OpenRouterModelList {
  data?: Array<{ id?: string; name?: string }>;
}

export async function checkOpenRouterModels(): Promise<Array<{ id: string; available: boolean; label: string; role: string }>> {
  const response = await fetch("https://openrouter.ai/api/v1/models", {
    headers: process.env.OPENROUTER_API_KEY
      ? { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` }
      : undefined
  });
  if (!response.ok) throw new Error(`OpenRouter models request failed with ${response.status}`);
  const json = (await response.json()) as OpenRouterModelList;
  const available = new Set((json.data ?? []).map((model) => model.id).filter(Boolean));
  return OPEN_SOURCE_MODELS.map((model) => ({
    ...model,
    available: available.has(model.id)
  }));
}
