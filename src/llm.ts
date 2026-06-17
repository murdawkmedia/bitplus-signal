import { SignalMatch } from "./types.js";

export async function refineDraft(match: SignalMatch): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return match.draftPublicReply;
  const model = process.env.OPENROUTER_MODEL || "z-ai/glm-5.1";
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/murdawkmedia/bitplus-signal",
      "X-Title": "Bitplus Signal"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "Write concise public reply drafts for technical conference outreach. Never DM, never pressure, never claim affiliation beyond the provided facts."
        },
        {
          role: "user",
          content: JSON.stringify({
            event: match.eventName,
            edition: match.eventEdition,
            city: match.eventCity,
            dates: match.eventDates,
            url: match.eventUrl,
            publicExcerpt: match.excerpt,
            matchedTopics: match.topicMatch
          })
        }
      ],
      temperature: 0.4,
      max_tokens: 180
    })
  });

  if (!response.ok) {
    throw new Error(`OpenRouter request failed with ${response.status}`);
  }
  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content?.trim() || match.draftPublicReply;
}
