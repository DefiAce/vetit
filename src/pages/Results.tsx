import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import SourceCard from "@/components/SourceCard";
import LoadingState from "@/components/LoadingState";
import ErrorMessage from "@/components/ErrorMessage";
import { motion } from "framer-motion";
import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import type { SourceType } from "@/lib/sourceRanker";
import type { Verdict } from "@/lib/ai";

// ── Types ──

interface Source {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  date?: string;
  sourceType: SourceType;
  sourceTypeLabel: string;
}

interface FactCheck {
  claim: string;
  rating: string;
  publisher: string;
  url: string;
  reviewDate?: string;
  snippet?: string;
}

interface OriginalSource {
  found: boolean;
  confidence?: number;
  name?: string;
  platform?: string;
  url?: string;
  date?: string;
  reason?: string;
}

interface Analysis {
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
  supportingSources: Array<{ title: string; url: string; domain: string }>;
  contradictingSources: Array<{ title: string; url: string; domain: string }>;
  factChecks: Array<{ publisher: string; rating: string; url: string }>;
}

interface VerifyResult {
  claim: string;
  queries: string[];
  sources: Source[];
  totalResults: number;
  factChecks: { found: boolean; results: FactCheck[] };
  originalSource: OriginalSource;
  analysis: Analysis;
}

// ── Verdict Display ──

const VERDICT_CONFIG: Record<
  Verdict,
  { label: string; color: string; bgColor: string; borderColor: string; icon: string }
> = {
  LIKELY_TRUE: {
    label: "Likely True",
    color: "text-emerald-800",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    icon: "✓",
  },
  LIKELY_FALSE: {
    label: "Likely False",
    color: "text-red-800",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    icon: "✗",
  },
  UNVERIFIED: {
    label: "Unverified",
    color: "text-amber-800",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    icon: "?",
  },
  INSUFFICIENT_EVIDENCE: {
    label: "Insufficient Evidence",
    color: "text-stone-600",
    bgColor: "bg-stone-50",
    borderColor: "border-stone-200",
    icon: "—",
  },
};

function VerdictCard({ analysis }: { analysis: Analysis }) {
  const config = VERDICT_CONFIG[analysis.verdict];
  const confidencePercent = Math.round(analysis.confidence * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`border-2 ${config.borderColor} ${config.bgColor} p-6 mb-8`}
    >
      <div className="flex items-center gap-3 mb-3">
        <span className={`text-2xl font-bold ${config.color}`}>
          {config.icon}
        </span>
        <div>
          <p className={`font-serif text-xl font-bold ${config.color}`}>
            {config.label}
          </p>
          <p className="text-xs text-stone-500 mt-0.5">
            Confidence: {confidencePercent}% — based on available evidence
          </p>
        </div>
      </div>
      <div className="h-px bg-stone-200 my-3" />
      <p className="font-serif text-sm leading-relaxed text-stone-700">
        {analysis.summary}
      </p>
    </motion.div>
  );
}

// ── Section Header ──

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div className="flex items-center gap-2 mb-4 mt-8">
      <h2 className="text-xs font-semibold tracking-[0.15em] uppercase text-stone-400">
        {title}
      </h2>
      {count !== undefined && (
        <span className="text-[11px] font-medium text-stone-400 tabular-nums">
          ({count})
        </span>
      )}
      <div className="flex-1 h-px bg-stone-200 ml-2" />
    </div>
  );
}

// ── Possible Original Source ──

function OriginalSourceCard({
  source,
}: {
  source: NonNullable<VerifyResult["originalSource"]>;
}) {
  if (!source.found) return null;

  const confidencePercent = source.confidence
    ? Math.round(source.confidence * 100)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="border border-stone-200 bg-[var(--verify-paper)] p-5 mb-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-semibold tracking-wide uppercase text-stone-400">
          Possible Original Source
        </span>
        {confidencePercent !== null && (
          <span className="text-[11px] text-stone-400">
            · {confidencePercent}% confidence
          </span>
        )}
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-serif text-base font-semibold text-stone-900 truncate">
            {source.name}
          </p>
          <p className="text-sm text-stone-500">
            {source.platform}
            {source.date && (
              <span>
                {" "}
                ·{" "}
                {new Date(source.date).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            )}
          </p>
          {source.reason && (
            <p className="text-xs text-stone-400 mt-2 leading-relaxed italic">
              {source.reason}
            </p>
          )}
        </div>

        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1.5 bg-stone-900 px-4 py-2 text-xs font-semibold text-white uppercase tracking-wide hover:bg-stone-800 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            View Source
          </a>
        )}
      </div>
    </motion.div>
  );
}

// ── Reasoning Section ──

function ReasoningSection({ analysis }: { analysis: Analysis }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="border-t border-stone-200 pt-6 mb-6"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left group"
      >
        <h2 className="text-xs font-semibold tracking-[0.15em] uppercase text-stone-400">
          Why?
        </h2>
        {expanded ? (
          <ChevronUp className="h-3 w-3 text-stone-400" />
        ) : (
          <ChevronDown className="h-3 w-3 text-stone-400" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          <p className="font-serif text-sm leading-relaxed text-stone-600">
            {analysis.reasoning}
          </p>

          {/* Supporting sources inline */}
          {analysis.supportingSources.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] font-semibold tracking-wide uppercase text-emerald-700 mb-1.5">
                Supporting sources
              </p>
              <ul className="space-y-1">
                {analysis.supportingSources.map((s, i) => (
                  <li key={i} className="text-xs text-stone-500">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-stone-300 underline-offset-2 hover:text-stone-800 transition-colors"
                    >
                      {s.title}
                    </a>
                    <span className="text-stone-400 ml-1">({s.domain})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Contradicting sources inline */}
          {analysis.contradictingSources.length > 0 && (
            <div className="mt-3">
              <p className="text-[11px] font-semibold tracking-wide uppercase text-red-700 mb-1.5">
                Contradicting sources
              </p>
              <ul className="space-y-1">
                {analysis.contradictingSources.map((s, i) => (
                  <li key={i} className="text-xs text-stone-500">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-stone-300 underline-offset-2 hover:text-stone-800 transition-colors"
                    >
                      {s.title}
                    </a>
                    <span className="text-stone-400 ml-1">({s.domain})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ── Fact Checks Section ──

function FactChecksSection({
  factChecks,
}: {
  factChecks: VerifyResult["factChecks"];
}) {
  if (!factChecks.found || factChecks.results.length === 0) {
    return (
      <>
        <SectionHeader title="Existing Fact-Checks" />
        <div className="border border-stone-200 bg-stone-50 p-5 text-center">
          <p className="text-sm text-stone-500">
            No existing fact-checks were found for this claim.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <SectionHeader
        title="Existing Fact-Checks"
        count={factChecks.results.length}
      />
      <div className="space-y-3">
        {factChecks.results.map((fc, i) => (
          <div
            key={i}
            className="border border-stone-200 bg-[var(--verify-paper)] p-4"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center rounded-sm border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase text-amber-800">
                {fc.rating}
              </span>
              <span className="text-xs text-stone-400">{fc.publisher}</span>
              {fc.reviewDate && (
                <span className="text-xs text-stone-400">
                  ·{" "}
                  {new Date(fc.reviewDate).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              )}
            </div>
            <a
              href={fc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-serif text-sm font-medium text-stone-800 hover:text-stone-600 transition-colors underline decoration-stone-300 underline-offset-2 hover:decoration-stone-500"
            >
              {fc.publisher} review
            </a>
            {fc.snippet && (
              <p className="text-xs text-stone-500 mt-1.5 leading-relaxed line-clamp-2">
                {fc.snippet}
              </p>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

// ── Main Results Page ──

export default function Results() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const claim = searchParams.get("claim") ?? "";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const verifyClaim = useAction(api.search.verifyClaim);

  const runSearch = useCallback(async () => {
    if (!claim.trim()) {
      navigate("/");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await verifyClaim({ claim: claim.trim() });
      setResult(response as unknown as VerifyResult);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [claim, verifyClaim, navigate]);

  useEffect(() => {
    if (claim.trim()) {
      runSearch();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBack = () => {
    navigate("/");
  };

  return (
    <main className="min-h-screen bg-[var(--verify-bg)]">
      {/* Header */}
      <header className="border-b border-stone-200">
        <div className="mx-auto max-w-3xl px-6 py-5">
          <button
            onClick={handleBack}
            className="font-serif text-sm tracking-widest uppercase text-stone-900 hover:text-stone-600 transition-colors"
          >
            VETIT
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 py-8">
        {loading && <LoadingState claim={claim} />}

        {error && (
          <div>
            <ErrorMessage message={error} onRetry={runSearch} />
            <button
              onClick={handleBack}
              className="mt-4 text-sm text-stone-500 underline decoration-stone-300 underline-offset-2 hover:text-stone-800 transition-colors"
            >
              ← Back to home
            </button>
          </div>
        )}

        {result && !loading && (
          <div>
            {/* Verdict */}
            <VerdictCard analysis={result.analysis} />

            {/* Claim */}
            <div className="mb-6 border-b border-stone-200 pb-6">
              <p className="text-xs font-semibold tracking-widest uppercase text-stone-400 mb-2">
                Claim
              </p>
              <p className="font-serif text-lg text-stone-900 leading-relaxed">
                &ldquo;{result.claim}&rdquo;
              </p>
            </div>

            {/* Why / Reasoning */}
            <ReasoningSection analysis={result.analysis} />

            {/* Possible Original Source */}
            <SectionHeader title="Possible Original Source" />
            <OriginalSourceCard source={result.originalSource} />

            {/* Supporting Evidence */}
            {result.analysis.supportingSources.length > 0 && (
              <>
                <SectionHeader
                  title="Supporting Evidence"
                  count={result.analysis.supportingSources.length}
                />
                <div className="divide-stone-200">
                  {result.analysis.supportingSources.map((s, i) => {
                    const fullSource = result.sources.find(
                      (src) => src.url === s.url,
                    );
                    return (
                      <SourceCard
                        key={`support-${i}`}
                        title={s.title}
                        url={s.url}
                        snippet={fullSource?.snippet ?? ""}
                        domain={s.domain}
                        date={fullSource?.date}
                        sourceType={fullSource?.sourceType ?? "general"}
                        sourceTypeLabel={
                          fullSource?.sourceTypeLabel ?? "Web"
                        }
                      />
                    );
                  })}
                </div>
              </>
            )}

            {/* Contradicting Evidence */}
            <SectionHeader
              title="Contradicting Evidence"
              count={result.analysis.contradictingSources.length}
            />
            {result.analysis.contradictingSources.length > 0 ? (
              <div className="divide-stone-200">
                {result.analysis.contradictingSources.map((s, i) => {
                  const fullSource = result.sources.find(
                    (src) => src.url === s.url,
                  );
                  return (
                    <SourceCard
                      key={`contra-${i}`}
                      title={s.title}
                      url={s.url}
                      snippet={fullSource?.snippet ?? ""}
                      domain={s.domain}
                      date={fullSource?.date}
                      sourceType={fullSource?.sourceType ?? "general"}
                      sourceTypeLabel={
                        fullSource?.sourceTypeLabel ?? "Web"
                      }
                    />
                  );
                })}
              </div>
            ) : (
              <div className="border border-stone-200 bg-stone-50 p-5">
                <p className="text-sm text-stone-500 italic">
                  No significant contradicting sources were found.
                </p>
              </div>
            )}

            {/* Fact Checks */}
            <FactChecksSection factChecks={result.factChecks} />

            {/* All Sources (collapsible) */}
            <details className="mt-8 border-t border-stone-200 pt-4">
              <summary className="cursor-pointer text-xs font-semibold tracking-widest uppercase text-stone-400 hover:text-stone-600 transition-colors">
                All sources searched ({result.totalResults})
              </summary>
              <div className="mt-4 divide-stone-200">
                {result.sources.map((source, i) => (
                  <SourceCard
                    key={`${source.url}-${i}`}
                    title={source.title}
                    url={source.url}
                    snippet={source.snippet}
                    domain={source.domain}
                    date={source.date}
                    sourceType={source.sourceType}
                    sourceTypeLabel={source.sourceTypeLabel}
                  />
                ))}
              </div>
            </details>

            {/* Search queries (collapsible) */}
            <details className="mt-6 border-t border-stone-200 pt-4">
              <summary className="cursor-pointer text-xs font-semibold tracking-widest uppercase text-stone-400 hover:text-stone-600 transition-colors">
                View search queries ({result.queries.length})
              </summary>
              <ul className="mt-3 space-y-1">
                {result.queries.map((q, i) => (
                  <li
                    key={i}
                    className="font-mono text-xs text-stone-500 leading-relaxed"
                  >
                    {q}
                  </li>
                ))}
              </ul>
            </details>

            {/* Disclaimer */}
            <div className="mt-8 border-t border-stone-200 pt-6">
              <p className="text-[11px] text-stone-400 leading-relaxed italic">
                VETIT searches publicly available web sources. Results are
                based on currently available evidence and should not be
                treated as definitive truth. Always verify important
                information through multiple trusted sources.
              </p>
            </div>

            {/* Back */}
            <div className="mt-6 pb-8">
              <button
                onClick={handleBack}
                className="text-sm text-stone-500 underline decoration-stone-300 underline-offset-2 hover:text-stone-800 transition-colors"
              >
                ← Vet another claim
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
