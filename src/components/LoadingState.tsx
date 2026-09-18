import { Check, Circle } from "lucide-react";

interface LoadingStep {
  label: string;
  status: "done" | "active" | "pending";
}

interface LoadingStateProps {
  claim: string;
}

export default function LoadingState({ claim }: LoadingStateProps) {
  const steps: LoadingStep[] = [
    { label: "Claim received", status: "done" },
    { label: "Searching the web", status: "active" },
    { label: "Finding related fact-checks", status: "pending" },
    { label: "Tracing possible source", status: "pending" },
    { label: "Comparing evidence", status: "pending" },
    { label: "Analyzing evidence with AI", status: "pending" },
  ];

  return (
    <div className="w-full">
      <div className="mb-8 border-b border-stone-200 pb-6">
        <p className="text-xs font-semibold tracking-widest uppercase text-stone-400 mb-2">
          Investigating claim
        </p>
        <p className="font-serif text-lg text-stone-900 leading-relaxed">
          &ldquo;{claim}&rdquo;
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold tracking-widest uppercase text-stone-400 mb-4">
          Searching available sources&hellip;
        </p>

        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-3">
            {step.status === "done" ? (
              <Check className="h-4 w-4 shrink-0 text-stone-900" />
            ) : step.status === "active" ? (
              <div className="h-4 w-4 shrink-0 rounded-full border-2 border-stone-900 border-t-transparent animate-spin" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-stone-300" />
            )}
            <span
              className={`text-sm ${
                step.status === "done"
                  ? "text-stone-600"
                  : step.status === "active"
                    ? "text-stone-900 font-medium"
                    : "text-stone-400"
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}

        <p className="text-xs text-stone-400 mt-4 italic">
          Publicly available web sources searched. This may take a moment.
        </p>
      </div>
    </div>
  );
}
