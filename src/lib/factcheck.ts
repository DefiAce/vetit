/**
 * Fact-check search abstraction.
 * Finds existing fact-checks related to a claim using web search.
 * Provider is isolated — can be swapped later.
 */

import { searchWeb, type SearchResult } from "./search";

export interface FactCheckResult {
  found: boolean;
  results: Array<{
    claim: string;
    rating: string;
    publisher: string;
    url: string;
    reviewDate?: string;
    snippet?: string;
  }>;
}

// Known fact-check domains and their rating extraction patterns
const FACT_CHECK_DOMAINS: Record<string, { name: string; ratingPatterns?: RegExp[] }> = {
  "snopes.com": { name: "Snopes" },
  "factcheck.org": { name: "FactCheck.org" },
  "politifact.com": { name: "PolitiFact" },
  "fullfact.org": { name: "Full Fact" },
  "truthorfiction.com": { name: "Truth or Fiction" },
  "factcheckers.org": { name: "FactCheckers" },
  "africacheck.org": { name: "Africa Check" },
  "poynter.org": { name: "Poynter / IFCN" },
  "apnews.com": { name: "AP News" },
  "reuters.com": { name: "Reuters" },
  "michaelsneed.com": { name: "PolitiFact" },
  "washingtonpost.com": { name: "Washington Post Fact Checker" },
  "theconversation.com": { name: "The Conversation" },
  "factcheckeureka.org": { name: "Eureka Fact Check" },
};

function extractRatingFromSnippet(
  snippet: string,
  title: string,
): string {
  const combined = `${title} ${snippet}`.toLowerCase();

  const ratingMap: Array<{ patterns: RegExp[]; rating: string }> = [
    { patterns: [/false|incorrect|misleading|debunked|myth|no,?\s*it's not|pants on fire|mostly false|zero/i], rating: "False" },
    { patterns: [/true|correct|verified|accurate|true,?\s*but|mostly true|half true|partly true|partly false/i], rating: "True" },
    { patterns: [/misleading|outdated|missing context|lacks context|needs context|half true|partly true/i], rating: "Misleading" },
    { patterns: [/unproven|unverified|no evidence|insufficient evidence|cannot be determined|undetermined/i], rating: "Unproven" },
    { patterns: [/satire|parody|satirical|not real|fake news/i], rating: "Satire" },
  ];

  for (const { patterns, rating } of ratingMap) {
    for (const pattern of patterns) {
      if (pattern.test(combined)) {
        return rating;
      }
    }
  }

  return "Unrated";
}

/**
 * Search for existing fact-checks related to a claim.
 * Uses Google Custom Search with fact-check focused queries.
 */
export async function searchFactChecks(
  claim: string,
  apiKey: string,
  searchEngineId: string,
): Promise<FactCheckResult> {
  const factCheckQueries = [
    `"${claim}" fact check`,
    `"${claim}" fact-check`,
    `site:snopes.com "${claim.slice(0, 60)}"`,
    `site:factcheck.org "${claim.slice(0, 60)}"`,
    `site:politifact.com "${claim.slice(0, 60)}"`,
  ];

  const allResults: SearchResult[] = [];

  for (const query of factCheckQueries) {
    try {
      const results = await searchWeb(query, apiKey, searchEngineId, 5);
      allResults.push(...results);
    } catch {
      // Continue with other queries
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

  // Filter to known fact-check domains or domains with fact-check signals
  const factCheckResults = uniqueResults.filter((result) => {
    const domain = result.domain.toLowerCase();
    const isKnownFactChecker = Object.keys(FACT_CHECK_DOMAINS).some((d) =>
      domain.includes(d),
    );
    const hasFactCheckSignal =
      /fact.?check|debunk|verify|false|myth|true or false/i.test(
        `${result.title} ${result.snippet}`,
      );
    return isKnownFactChecker || hasFactCheckSignal;
  });

  if (factCheckResults.length === 0) {
    return { found: false, results: [] };
  }

  // Normalize into structured fact-check results
  const normalizedFactChecks = factCheckResults.map((result) => {
    const domain = result.domain.toLowerCase();
    const factCheckDomain = Object.entries(FACT_CHECK_DOMAINS).find(([d]) =>
      domain.includes(d),
    );
    const publisher = factCheckDomain ? factCheckDomain[1].name : result.domain;
    const rating = extractRatingFromSnippet(result.snippet, result.title);

    return {
      claim: claim,
      rating,
      publisher,
      url: result.url,
      reviewDate: result.date,
      snippet: result.snippet,
    };
  });

  // Limit to top 5 most relevant
  return {
    found: true,
    results: normalizedFactChecks.slice(0, 5),
  };
}
