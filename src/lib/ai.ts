/**
 * AI evidence analysis.
 * Analyzes a claim against collected sources and produces a structured verdict.
 * The AI does NOT browse the internet — it only receives evidence supplied by our backend.
 */

export type Verdict =
  | "LIKELY_TRUE"
  | "LIKELY_FALSE"
  | "UNVERIFIED"
  | "INSUFFICIENT_EVIDENCE";

export interface AIAnalysis {
  verdict: Verdict;
  confidence: number;
  claim: string;
  summary: string;
  reasoning: string;
  possibleOriginalSource: {
    found: boolean;
    name?: string;
    platform?: string;
    url?: string;
    reason?: string;
  };
  supportingSources: Array<{
    title: string;
    url: string;
    domain: string;
  }>;
  contradictingSources: Array<{
    title: string;
    url: string;
    domain: string;
  }>;
  factChecks: Array<{
    publisher: string;
    rating: string;
    url: string;
  }>;
}

const SYSTEM_PROMPT = `You are an evidence-analysis assistant for VETIT, an information verification tool.

Your job is to analyze a user's claim using ONLY the sources provided. Do not invent facts. Do not use information not contained in the supplied evidence.

Consider:
1. What exactly is the claim?
2. Which sources support the claim?
3. Which sources contradict the claim?
4. Is there a primary or official source?
5. Is there an existing fact check?
6. Which source appears earliest?
7. Are multiple independent sources reporting the same information?
8. Is the evidence sufficient to reach a conclusion?

IMPORTANT RULES:
- Do not treat social-media popularity, number of reposts, or number of repeating websites as proof of truth.
- You must clearly communicate uncertainty.
- Confidence represents the strength of the available evidence, NOT certainty about reality.
- When evidence is weak, use UNVERIFIED or INSUFFICIENT_EVIDENCE.
- When sources disagree, use INSUFFICIENT_EVIDENCE.
- Do not force a verdict when evidence is insufficient.
- You can use LIKELY_TRUE or LIKELY_FALSE when reliable evidence strongly supports or contradicts the claim.

Return ONLY valid JSON matching this exact structure:
{
  "verdict": "LIKELY_TRUE" | "LIKELY_FALSE" | "UNVERIFIED" | "INSUFFICIENT_EVIDENCE",
  "confidence": <number between 0 and 1>,
  "claim": "<the original claim>",
  "summary": "<1-3 sentence plain-English explanation of the finding>",
  "reasoning": "<3-5 sentences explaining the reasoning, referencing specific sources>",
  "supportingSources": [{"title": "...", "url": "...", "domain": "..."}],
  "contradictingSources": [{"title": "...", "url": "...", "domain": "..."}],
  "factChecks": [{"publisher": "...", "rating": "...", "url": "..."}]
}`;

function buildUserPrompt(
  claim: string,
  sources: Array<{ title: string; url: string; domain: string; snippet: string; sourceType: string; date?: string }>,
  factChecks: Array<{ publisher: string; rating: string; url: string; snippet?: string }>,
  possibleOriginalSource: { found: boolean; name?: string; platform?: string; url?: string; date?: string; reason?: string },
): string {
  let prompt = `## Claim to verify\n"${claim}"\n\n`;

  // Sources
  prompt += `## Sources found (${sources.length})\n\n`;
  for (let i = 0; i < Math.min(sources.length, 20); i++) {
    const s = sources[i];
    prompt += `${i + 1}. [${s.sourceType}] ${s.title}\n`;
    prompt += `   URL: ${s.url}\n`;
    prompt += `   Domain: ${s.domain}\n`;
    if (s.date) prompt += `   Date: ${s.date}\n`;
    if (s.snippet) prompt += `   Snippet: ${s.snippet}\n`;
    prompt += "\n";
  }

  // Fact checks
  if (factChecks.length > 0) {
    prompt += `## Existing fact-checks (${factChecks.length})\n\n`;
    for (const fc of factChecks) {
      prompt += `- ${fc.publisher}: "${fc.rating}"\n`;
      prompt += `  URL: ${fc.url}\n`;
      if (fc.snippet) prompt += `  Snippet: ${fc.snippet}\n`;
      prompt += "\n";
    }
  }

  // Possible original source
  if (possibleOriginalSource.found) {
    prompt += `## Possible original source\n`;
    prompt += `Name: ${possibleOriginalSource.name}\n`;
    prompt += `Platform: ${possibleOriginalSource.platform}\n`;
    prompt += `URL: ${possibleOriginalSource.url}\n`;
    prompt += `Date: ${possibleOriginalSource.date ?? "Unknown"}\n`;
    prompt += `Reason: ${possibleOriginalSource.reason}\n\n`;
  }

  prompt += `Analyze this evidence and return your structured verdict as JSON.`;

  return prompt;
}

function validateAnalysis(data: unknown): data is AIAnalysis {
  if (typeof data !== "object" || data === null) return false;
  const obj = data as Record<string, unknown>;

  const validVerdicts = ["LIKELY_TRUE", "LIKELY_FALSE", "UNVERIFIED", "INSUFFICIENT_EVIDENCE"];
  if (!validVerdicts.includes(obj.verdict as string)) return false;
  if (typeof obj.confidence !== "number") return false;
  if (typeof obj.claim !== "string") return false;
  if (typeof obj.summary !== "string") return false;
  if (typeof obj.reasoning !== "string") return false;
  if (!Array.isArray(obj.supportingSources)) return false;
  if (!Array.isArray(obj.contradictingSources)) return false;
  if (!Array.isArray(obj.factChecks)) return false;
  if (typeof obj.possibleOriginalSource !== "object" || obj.possibleOriginalSource === null) return false;

  return true;
}

/**
 * Analyze evidence using an AI model.
 * Requires OPENAI_API_KEY environment variable.
 */
export async function analyzeEvidence(
  claim: string,
  sources: Array<{ title: string; url: string; domain: string; snippet: string; sourceType: string; date?: string }>,
  factChecks: Array<{ publisher: string; rating: string; url: string; snippet?: string }>,
  possibleOriginalSource: { found: boolean; name?: string; platform?: string; url?: string; date?: string; reason?: string },
  apiKey: string,
): Promise<AIAnalysis> {
  const userPrompt = buildUserPrompt(claim, sources, factChecks, possibleOriginalSource);

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    if (response.status === 401) {
      throw new Error("Invalid AI API key. Please check your OPENAI_API_KEY configuration.");
    }
    if (response.status === 429) {
      throw new Error("AI service rate limit exceeded. Please try again in a moment.");
    }
    throw new Error(`AI service error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("AI returned an empty response.");
  }

  // Parse JSON response
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("AI returned invalid JSON. Please try again.");
  }

  // Validate structure
  if (!validateAnalysis(parsed)) {
    throw new Error("AI response is missing required fields. Please try again.");
  }

  // Ensure claim matches
  parsed.claim = claim;

  // Clamp confidence
  parsed.confidence = Math.min(1, Math.max(0, parsed.confidence));

  return parsed;
}
