/**
 * Source classification and ranking based on domain heuristics.
 * This is for organizing evidence only — it does not imply truthfulness.
 */

export type SourceType = "primary" | "news" | "fact_check" | "social" | "general";

interface DomainRule {
  patterns: RegExp[];
  type: SourceType;
}

const DOMAIN_RULES: DomainRule[] = [
  // Primary sources — government, institutional, official
  {
    patterns: [
      /\.gov$/,
      /\.mil$/,
      /\.edu$/,
      /\.org$/,
      /who\.int$/,
      /imf\.org$/,
      /worldbank\.org$/,
      /un\.org$/,
      /nasa\.gov$/,
      /sec\.gov$/,
      /federalreserve\.gov$/,
      /whitehouse\.gov$/,
    ],
    type: "primary",
  },
  // Fact-checking organizations
  {
    patterns: [
      /snopes\.com$/,
      /factcheck\.org$/,
      /politifact\.com$/,
      /fullfact\.org$/,
      /truthorfiction\.com$/,
      /factcheckers\.org$/,
      /africacheck\.org$/,
      /adow\.org$/,
      /poynter\.org$/,
      /apnews\.com\/hub\/ap-fact-check/,
    ],
    type: "fact_check",
  },
  // Major news outlets
  {
    patterns: [
      /reuters\.com$/,
      /apnews\.com$/,
      /bbc\.com$/,
      /bbc\.co\.uk$/,
      /cnn\.com$/,
      /nytimes\.com$/,
      /washingtonpost\.com$/,
      /theguardian\.com$/,
      /ft\.com$/,
      /wsj\.com$/,
      /bloomberg\.com$/,
      /aljazeera\.com$/,
      /abc\.net$/,
      /cbsnews\.com$/,
      /nbcnews\.com$/,
      /usatoday\.com$/,
      /theguardian\.com$/,
      /independent\.co\.uk$/,
      /dailymail\.co\.uk$/,
      /telegraph\.co\.uk$/,
      /forbes\.com$/,
      /techcrunch\.com$/,
      /theverge\.com$/,
      /wired\.com$/,
      /venturebeat\.com$/,
      /coindesk\.com$/,
      /cointelegraph\.com$/,
      /cryptonews\.com$/,
      /decrypt\.co$/,
      /theblock\.co$/,
      /cnbc\.com$/,
    ],
    type: "news",
  },
  // Social platforms
  {
    patterns: [
      /twitter\.com$/,
      /x\.com$/,
      /reddit\.com$/,
      /youtube\.com$/,
      /instagram\.com$/,
      /facebook\.com$/,
      /tiktok\.com$/,
      /threads\.net$/,
      /mastodon/,
      /bsky\.app$/,
    ],
    type: "social",
  },
];

/**
 * Classify a domain into a source type.
 */
export function classifySource(domain: string): SourceType {
  const normalized = domain.toLowerCase();

  for (const rule of DOMAIN_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(normalized)) {
        return rule.type;
      }
    }
  }

  return "general";
}

/**
 * Get a human-readable label for a source type.
 */
export function sourceTypeLabel(type: SourceType): string {
  const labels: Record<SourceType, string> = {
    primary: "Primary Source",
    news: "News",
    fact_check: "Fact Check",
    social: "Social",
    general: "Web",
  };
  return labels[type];
}

/**
 * Get a color class for a source type badge.
 */
export function sourceTypeColor(type: SourceType): string {
  const colors: Record<SourceType, string> = {
    primary: "bg-emerald-100 text-emerald-800 border-emerald-200",
    news: "bg-blue-100 text-blue-800 border-blue-200",
    fact_check: "bg-amber-100 text-amber-800 border-amber-200",
    social: "bg-purple-100 text-purple-800 border-purple-200",
    general: "bg-stone-100 text-stone-600 border-stone-200",
  };
  return colors[type];
}
