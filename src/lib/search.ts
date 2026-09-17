/**
 * Search provider abstraction.
 * Swap the underlying provider without changing the rest of the app.
 */

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  date?: string;
}

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

interface GoogleSearchItem {
  title?: string;
  link?: string;
  snippet?: string;
  pagemap?: {
    metatags?: Array<{ "article:published_time"?: string; date?: string }>;
    cse_thumbnail?: Array<{ src?: string }>;
  };
}

/**
 * Search the web using Google Custom Search JSON API.
 * Returns normalized SearchResult[].
 */
export async function searchWeb(
  query: string,
  apiKey: string,
  searchEngineId: string,
  numResults = 10,
): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    key: apiKey,
    cx: searchEngineId,
    q: query,
    num: String(Math.min(numResults, 10)),
  });

  const response = await fetch(
    `https://www.googleapis.com/customsearch/v1?${params.toString()}`,
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    if (response.status === 403) {
      throw new Error("Invalid or unauthorized API key. Please check your search API configuration.");
    }
    if (response.status === 429) {
      throw new Error("Search rate limit exceeded. Please try again in a moment.");
    }
    throw new Error(`Search API returned status ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const items: GoogleSearchItem[] = data.items ?? [];

  return items
    .filter((item) => item.link && item.title)
    .map((item) => {
      const url = item.link!;
      const metatags = item.pagemap?.metatags?.[0];
      const date =
        metatags?.["article:published_time"] ?? metatags?.date ?? undefined;

      return {
        title: item.title!,
        url,
        snippet: item.snippet ?? "",
        domain: extractDomain(url),
        date: date && typeof date === "string" ? date : undefined,
      };
    });
}
