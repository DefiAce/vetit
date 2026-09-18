import { action } from "./_generated/server";
import { v } from "convex/values";
import { generateSearchQueries } from "../lib/queryGenerator";
import { searchWeb, type SearchResult } from "../lib/search";
import { classifySource, type SourceType } from "../lib/sourceRanker";
import { searchFactChecks, type FactCheckResult } from "../lib/factcheck";
import { detectOriginalSource, type OriginalSource } from "../lib/originalSource";
import { analyzeEvidence, type AIAnalysis, type Verdict } from "../lib/ai";

export type { Verdict, AIAnalysis, OriginalSource, FactCheckResult };

export interface ClassifiedSource extends SearchResult {
  sourceType: SourceType;
  sourceTypeLabel: string;
}

export interface VerifiedResult {
  claim: string;
  queries: string[];
  sources: ClassifiedSource[];
  totalResults: number;
  factChecks: FactCheckResult;
  originalSource: OriginalSource;
  analysis: AIAnalysis;
}

export const verifyClaim = action({
  args: {
    claim: v.string(),
  },
  handler: async (_ctx, args): Promise<VerifiedResult> => {
    const claim = args.claim;

    if (!claim || typeof claim !== "string") {
      throw new Error("No claim provided.");
    }

    const trimmed = claim.trim();
    if (trimmed.length === 0) {
      throw new Error("Claim cannot be empty.");
    }
    if (trimmed.length > 500) {
      throw new Error("Claim is too long. Please keep it under 500 characters.");
    }

    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!apiKey || !searchEngineId) {
      throw new Error(
        "Search API is not configured. Please add GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID environment variables.",
      );
    }

    if (!openaiKey) {
      throw new Error(
        "AI API is not configured. Please add OPENAI_API_KEY environment variable.",
      );
    }

    // ── Step 1: Generate search queries ──
    const queries = generateSearchQueries(trimmed);

    // ── Step 2: Execute searches ──
    const allResults: SearchResult[] = [];
    for (const query of queries) {
      try {
        const results = await searchWeb(query, apiKey, searchEngineId, 10);
        allResults.push(...results);
      } catch (err) {
        console.warn(`Query failed: "${query}"`, err);
      }
    }

    // ── Step 3: Deduplicate by URL ──
    const seenUrls = new Set<string>();
    const uniqueResults: SearchResult[] = [];
    for (const result of allResults) {
      const normalizedUrl = result.url.toLowerCase().replace(/\/$/, "");
      if (!seenUrls.has(normalizedUrl)) {
        seenUrls.add(normalizedUrl);
        uniqueResults.push(result);
      }
    }

    // ── Step 4: Classify each source ──
    const classifiedResults: ClassifiedSource[] = uniqueResults.map((result) => {
      const sourceType = classifySource(result.domain);
      return {
        ...result,
        sourceType,
        sourceTypeLabel:
          sourceType === "primary"
            ? "Primary Source"
            : sourceType === "news"
              ? "News"
              : sourceType === "fact_check"
                ? "Fact Check"
                : sourceType === "social"
                  ? "Social"
                  : "Web",
      };
    });

    // ── Step 5: Search for fact-checks ──
    let factChecks: FactCheckResult = { found: false, results: [] };
    try {
      factChecks = await searchFactChecks(trimmed, apiKey, searchEngineId);
    } catch (err) {
      console.warn("Fact-check search failed:", err);
    }

    // ── Step 6: Detect possible original source ──
    const originalSource = detectOriginalSource(
      classifiedResults.map((s) => ({
        url: s.url,
        title: s.title,
        snippet: s.snippet,
        domain: s.domain,
        date: s.date,
        sourceType: s.sourceType,
      })),
    );

    // ── Step 7: AI analysis ──
    let analysis: AIAnalysis;
    try {
      analysis = await analyzeEvidence(
        trimmed,
        // Limit sources sent to AI for performance
        classifiedResults.slice(0, 20),
        factChecks.results,
        originalSource,
        openaiKey,
      );
    } catch (err) {
      // Fallback: create a basic analysis without AI
      const message = err instanceof Error ? err.message : "Unknown AI error";
      analysis = {
        verdict: "UNVERIFIED",
        confidence: 0,
        claim: trimmed,
        summary: `Unable to complete AI analysis: ${message}. Please review the sources below.`,
        reasoning: `The AI analysis service encountered an error. ${classifiedResults.length} sources were found but could not be automatically analyzed.`,
        possibleOriginalSource: originalSource,
        supportingSources: [],
        contradictingSources: [],
        factChecks: factChecks.results.map((fc) => ({
          publisher: fc.publisher,
          rating: fc.rating,
          url: fc.url,
        })),
      };
    }

    return {
      claim: trimmed,
      queries,
      sources: classifiedResults,
      totalResults: classifiedResults.length,
      factChecks,
      originalSource,
      analysis,
    };
  },
});
