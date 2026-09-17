import { useState, type FormEvent } from "react";
import { Search } from "lucide-react";

interface SearchBoxProps {
  onSubmit: (claim: string) => void;
  isLoading?: boolean;
}

const MAX_LENGTH = 500;

export default function SearchBox({ onSubmit, isLoading }: SearchBoxProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();

    if (!trimmed) {
      setError("Please enter a claim to vet.");
      return;
    }

    if (trimmed.length > MAX_LENGTH) {
      setError(`Claim is too long. Maximum ${MAX_LENGTH} characters.`);
      return;
    }

    setError(null);
    onSubmit(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Paste a claim, headline, or statement..."
          rows={3}
          maxLength={MAX_LENGTH + 50}
          className="w-full resize-none rounded-none border-2 border-stone-300 bg-white px-5 py-4 font-serif text-lg text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-0"
          aria-label="Claim to vet"
        />
        <div className="mt-1 flex items-center justify-between px-1">
          <span className="text-xs text-stone-400 tabular-nums">
            {value.length}/{MAX_LENGTH}
          </span>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isLoading || !value.trim()}
        className="mt-4 inline-flex items-center gap-2.5 bg-stone-900 px-8 py-3.5 font-serif text-sm font-semibold tracking-wide text-white uppercase transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Search className="h-4 w-4" />
        {isLoading ? "Vetting..." : "Vet Claim"}
      </button>
    </form>
  );
}
