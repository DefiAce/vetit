import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";
import SourceCard from "@/components/SourceCard";
import LoadingState from "@/components/LoadingState";
import ErrorMessage from "@/components/ErrorMessage";
import type { SourceType } from "@/lib/sourceRanker";

interface Source {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  date?: string;
  sourceType: SourceType;
  sourceTypeLabel: string;
}

interface VerifyResult {
  claim: string;
  queries: string[];
  sources: Source[];
  totalResults: number;
}

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
            {/* Claim summary */}
            <div className="mb-8 border-b border-stone-200 pb-6">
              <p className="text-xs font-semibold tracking-widest uppercase text-stone-400 mb-2">
                Investigating claim
              </p>
              <p className="font-serif text-lg text-stone-900 leading-relaxed">
                &ldquo;{result.claim}&rdquo;
              </p>
            </div>

            {/* Stats */}
            <div className="mb-6 flex flex-wrap gap-6 text-xs font-semibold tracking-widest uppercase text-stone-400">
              <div>
                <span className="text-stone-900">{result.queries.length}</span>{" "}
                searches performed
              </div>
              <div>
                <span className="text-stone-900">{result.totalResults}</span>{" "}
                sources found
              </div>
            </div>

            {/* Sources */}
            {result.sources.length > 0 ? (
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase text-stone-400 mb-4">
                  Sources
                </p>
                <div className="divide-stone-200">
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
              </div>
            ) : (
              <div className="border border-stone-200 bg-stone-50 p-8 text-center">
                <p className="font-serif text-sm text-stone-600">
                  No sources were found for this claim.
                </p>
                <p className="mt-2 text-xs text-stone-400">
                  Try rephrasing the claim or checking the spelling.
                </p>
              </div>
            )}

            {/* Queries performed (collapsible) */}
            <details className="mt-8 border-t border-stone-200 pt-4">
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

            {/* Back */}
            <div className="mt-8 border-t border-stone-200 pt-6">
              <button
                onClick={handleBack}
                className="text-sm text-stone-500 underline decoration-stone-300 underline-offset-2 hover:text-stone-800 transition-colors"
              >
                ← Verify another claim
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
