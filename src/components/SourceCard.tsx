import { ExternalLink } from "lucide-react";
import { sourceTypeColor, type SourceType } from "@/lib/sourceRanker";

interface SourceCardProps {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  date?: string;
  sourceType: SourceType;
  sourceTypeLabel: string;
}

export default function SourceCard({
  title,
  url,
  snippet,
  domain,
  date,
  sourceType,
  sourceTypeLabel,
}: SourceCardProps) {
  return (
    <article className="border-b border-stone-200 py-5 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2 mb-1.5">
        <span
          className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${sourceTypeColor(sourceType)}`}
        >
          {sourceTypeLabel}
        </span>
        <span className="text-xs text-stone-400">{domain}</span>
        {date && (
          <span className="text-xs text-stone-400">
            · {new Date(date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
      </div>

      <h3 className="font-serif text-base font-semibold leading-snug text-stone-900 mb-1">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-stone-600 transition-colors underline decoration-stone-300 underline-offset-2 hover:decoration-stone-500"
        >
          {title}
        </a>
      </h3>

      {snippet && (
        <p className="text-sm leading-relaxed text-stone-500 mb-2 line-clamp-3">
          {snippet}
        </p>
      )}

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-stone-900 transition-colors"
      >
        <ExternalLink className="h-3 w-3" />
        Open Source
      </a>
    </article>
  );
}
