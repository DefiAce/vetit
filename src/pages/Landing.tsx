import { useState } from "react";
import { useNavigate } from "react-router";
import SearchBox from "@/components/SearchBox";
import { motion } from "framer-motion";
import {
  Search,
  Globe,
  BarChart3,
  FileText,
  Shield,
  Brain,
  GitBranch,
} from "lucide-react";

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Enter a claim",
    description:
      "Paste a claim, headline, or piece of information you want to check.",
    icon: Search,
  },
  {
    step: "02",
    title: "We search available sources",
    description:
      "VETIT searches publicly indexed web pages and fact-check databases for relevant evidence.",
    icon: Globe,
  },
  {
    step: "03",
    title: "We trace the possible source",
    description:
      "We identify the earliest publicly indexed origin of the claim.",
    icon: GitBranch,
  },
  {
    step: "04",
    title: "AI analyzes the evidence",
    description:
      "Our AI examines all collected sources, fact-checks, and contradictions — without browsing the internet itself.",
    icon: Brain,
  },
  {
    step: "05",
    title: "You get a verdict",
    description:
      "Review the AI verdict, supporting evidence, contradicting sources, and existing fact-checks.",
    icon: Shield,
  },
  {
    step: "06",
    title: "Every conclusion is sourced",
    description:
      "Every claim traces back to evidence you can open and verify yourself.",
    icon: FileText,
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (claim: string) => {
    setIsLoading(true);
    navigate(`/verify?claim=${encodeURIComponent(claim)}`);
  };

  return (
    <div className="min-h-screen bg-[var(--verify-bg)]">
      {/* Header */}
      <header className="border-b border-stone-200">
        <div className="mx-auto max-w-3xl px-6 py-5">
          <span className="font-serif text-sm tracking-widest uppercase text-stone-900">
            VETIT
          </span>
        </div>
      </header>

      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-3xl px-6 pt-16 pb-12"
      >
        {/* Thin rule */}
        <div className="mb-8 h-px bg-stone-300" />

        <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight text-stone-900 mb-4">
          Check information
          <br />
          before you share it.
        </h1>

        <p className="font-serif text-lg text-stone-500 leading-relaxed max-w-xl mb-10">
          Search the web, find fact-checks, trace the original source, and
          understand the evidence behind a claim — powered by AI analysis.
        </p>

        {/* Search input */}
        <SearchBox onSubmit={handleSubmit} isLoading={isLoading} />

        {/* Trust signals */}
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-stone-400">
          <span>✓ Searches publicly indexed sources</span>
          <span>✓ Finds existing fact-checks</span>
          <span>✓ AI-powered evidence analysis</span>
        </div>
      </motion.section>

      {/* How it works */}
      <section className="border-t border-stone-200">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <h2 className="font-serif text-xs font-semibold tracking-[0.2em] uppercase text-stone-400 mb-8">
            How it works
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {HOW_IT_WORKS.map((item) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.4,
                    delay: 0.08 * parseInt(item.step),
                  }}
                  className="flex gap-4"
                >
                  <div className="shrink-0 mt-1">
                    <span className="font-serif text-xs text-stone-300 font-semibold">
                      {item.step}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4 text-stone-400" />
                      <h3 className="font-serif text-sm font-semibold text-stone-900">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-sm text-stone-500 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="border-t border-stone-200">
        <div className="mx-auto max-w-3xl px-6 py-8">
          <p className="text-xs text-stone-400 leading-relaxed italic text-center max-w-lg mx-auto">
            VETIT searches publicly available web sources and analyzes them
            with AI. Results should not be treated as definitive truth.
            Always verify important information through multiple trusted
            sources.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200">
        <div className="mx-auto max-w-3xl px-6 py-6 flex items-center justify-between">
          <span className="text-xs text-stone-400">
            VETIT — AI-powered claim verification
          </span>
          <span className="text-xs text-stone-300">MVP</span>
        </div>
      </footer>
    </div>
  );
}
