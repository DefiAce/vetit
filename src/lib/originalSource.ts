/**
 * Original source detection.
 * Identifies the POSSIBLE original source of a claim.
 * Never claims absolute certainty — always uses "possible" language.
 */

export interface OriginalSource {
  found: boolean;
  confidence?: number;
  name?: string;
  platform?: string;
  url?: string;
  date?: string;
  reason?: string;
}

interface SourceCandidate {
  url: string;
  title: string;
  snippet: string;
  domain: string;
  date?: string;
  sourceType: string;
}

// Domains that are typically aggregators or secondary (less likely to be original)
const AGGREGATOR_DOMAINS = [
  "news.google.com",
  "flipboard.com",
  "apple.news",
  "smartnews.com",
  "ground.news",
  "allsides.com",
  "mediabiasfactcheck.com",
];

// Social platform detection
const SOCIAL_PLATFORMS: Array<{ patterns: RegExp[]; name: string }> = [
  { patterns: [/x\.com/i, /twitter\.com/i], name: "X" },
  { patterns: [/reddit\.com/i], name: "Reddit" },
  { patterns: [/youtube\.com/i, /youtu\.be/i], name: "YouTube" },
  { patterns: [/facebook\.com/i, /fb\.com/i], name: "Facebook" },
  { patterns: [/instagram\.com/i], name: "Instagram" },
  { patterns: [/tiktok\.com/i], name: "TikTok" },
  { patterns: [/threads\.net/i], name: "Threads" },
  { patterns: [/mastodon/i], name: "Mastodon" },
  { patterns: [/bsky\.app/i, /bluesky\.social/i], name: "Bluesky" },
  { patterns: [/substack\.com/i], name: "Substack" },
  { patterns: [/medium\.com/i], name: "Medium" },
];

function detectPlatform(url: string, domain: string): string | null {
  for (const platform of SOCIAL_PLATFORMS) {
    for (const pattern of platform.patterns) {
      if (pattern.test(url) || pattern.test(domain)) {
        return platform.name;
      }
    }
  }
  return null;
}

function isAggregator(domain: string): boolean {
  return AGGREGATOR_DOMAINS.some((d) => domain.includes(d));
}

function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch {
    return null;
  }
}

function extractAccountFromUrl(url: string): string | null {
  // Try to extract account name from social media URLs
  // e.g., https://x.com/elonmusk/status/123 -> @elonmusk
  const xMatch = url.match(/(?:x\.com|twitter\.com)\/([^/]+)\/status/);
  if (xMatch) return `@${xMatch[1]}`;

  const redditMatch = url.match(/reddit\.com\/r\/([^/]+)/);
  if (redditMatch) return `r/${redditMatch[1]}`;

  const ytMatch = url.match(/youtube\.com\/(?!watch|results|channel|playlist|shorts)([^/]+)/);
  if (ytMatch) return ytMatch[1];

  return null;
}

/**
 * Analyze sources to identify the possible original source of a claim.
 */
export function detectOriginalSource(
  sources: SourceCandidate[],
): OriginalSource {
  if (sources.length === 0) {
    return { found: false };
  }

  // Score each candidate
  const candidates = sources.map((source) => {
    let score = 0;
    const domain = source.domain.toLowerCase();
    const platform = detectPlatform(source.url, domain);
    const date = parseDate(source.date);
    const account = extractAccountFromUrl(source.url);

    // Social media posts are more likely to be original
    if (platform) {
      score += 3;
    }

    // If it has an account name (individual post), boost
    if (account) {
      score += 2;
    }

    // Earlier dates score higher
    if (date) {
      const daysSince2020 = (date.getTime() - new Date("2020-01-01").getTime()) / (1000 * 60 * 60 * 24);
      score += Math.min(daysSince2020 / 100, 5); // slight boost for recency
    }

    // Aggregators are less likely to be original
    if (isAggregator(domain)) {
      score -= 3;
    }

    // Blog/personal sites more likely than wire services
    if (domain.includes("blog") || domain.includes("wordpress") || domain.includes("substack")) {
      score += 1;
    }

    // Major wire services are usually secondary
    if (["reuters.com", "apnews.com", "afp.com"].some((d) => domain.includes(d))) {
      score -= 1;
    }

    // Snippet analysis: if it quotes others, it's likely secondary
    const snippet = source.snippet.toLowerCase();
    if (/according to|reported by|cited|quoted|stated that|wrote that/.test(snippet)) {
      score -= 2;
    }

    // If snippet says "first" or "original" or "broke", boost
    if (/first reported|original|broke the news|first to report|exclusive/.test(snippet)) {
      score += 3;
    }

    return {
      ...source,
      score,
      platform,
      account,
      date,
    };
  });

  // Sort by score descending, then by date ascending (earlier is better)
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aDate = a.date?.getTime() ?? Infinity;
    const bDate = b.date?.getTime() ?? Infinity;
    return aDate - bDate;
  });

  const top = candidates[0];

  // If the top candidate has a low score, evidence is insufficient
  if (top.score < 2) {
    return { found: false };
  }

  const confidence = Math.min(0.95, Math.max(0.3, top.score / 10));

  const platform = top.platform ?? "Web";
  const name = top.account ?? top.title;

  // Build reasoning
  let reason = "";
  if (top.platform) {
    reason = `This appears to be the earliest publicly indexed ${top.platform} post related to this claim`;
  } else {
    reason = `This appears to be the earliest publicly indexed source related to this claim`;
  }

  if (top.date) {
    reason += `, published on ${new Date(top.date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}`;
  }

  reason += ". However, this is only a possible original source — the actual origin may not be publicly indexed.";

  return {
    found: true,
    confidence: Math.round(confidence * 100) / 100,
    name,
    platform,
    url: top.url,
    date: top.date ? top.date.toISOString() : undefined,
    reason,
  };
}
