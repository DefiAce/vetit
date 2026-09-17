import { action } from "./_generated/server";
import { v } from "convex/values";
import { generateSearchQueries } from "../lib/queryGenerator";
import { searchWeb, type SearchResult } from "../lib/search";
import { classifySource, type SourceType } from "../lib/sourceRanker";

export interface VerifiedResult {
  claim: string;
  queries: string[];
  sources: Array<SearchResult & { sourceType: SourceType; sourceTypeLabel: string }>;
  totalResults: number;
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

    if (!apiKey || !searchEngineId) {
      throw new Error(
        "Search API is not configured. Please add GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID environment variables.",
      );
    }

    // Generate search queries
    const queries = generateSearchQueries(trimmed);

    // Execute searches and collect all results
    const allResults: SearchResult[] = [];

    for (const query of queries) {
      try {
        const results = await searchWeb(query, apiKey, searchEngineId, 10);
        allResults.push(...results);
      } catch (err) {
        // Log but don't fail — other queries might succeed
        console.warn(`Query failed: "${query}"`, err);
      }
    }

    // Deduplicate by URL
    const seenUrls = new Set<string>();
    const uniqueResults: SearchResult[] = [];

    for (const result of allResults) {
      const normalizedUrl = result.url.toLowerCase().replace(/\/$/, "");
      if (!seenUrls.has(normalizedUrl)) {
        seenUrls.add(normalizedUrl);
        uniqueResults.push(result);
      }
    }

    // Classify each source
    const classifiedResults = uniqueResults.map((result) => {
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

    return {
      claim: trimmed,
      queries,
      sources: classifiedResults,
      totalResults: classifiedResults.length,
    };
  },
});
