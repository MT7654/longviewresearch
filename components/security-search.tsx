"use client";

import { ArrowUpRight, Search, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Result = {
  symbol: string;
  name: string;
  exchange: string;
  country: string;
  currency: string;
  type: string;
  source: string;
};

export function SecuritySearch({ compact = false }: { compact?: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const requestId = useRef(0);

  useEffect(() => {
    if (!query.trim()) {
      return;
    }
    const current = ++requestId.current;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/securities/search?q=${encodeURIComponent(query)}`);
        const body = await response.json() as { results?: Result[] };
        if (current === requestId.current) setResults(body.results ?? []);
      } finally {
        if (current === requestId.current) setLoading(false);
      }
    }, 260);
    return () => window.clearTimeout(timer);
  }, [query]);

  function openLesson(symbol: string) {
    setOpen(false);
    router.push(`/research/${encodeURIComponent(symbol.toUpperCase())}`);
  }

  return (
    <div className={`security-search ${compact ? "compact" : ""}`}>
      <form onSubmit={(event) => { event.preventDefault(); if (query.trim()) openLesson(query.trim()); }}>
        <Search aria-hidden="true" />
        <label className="sr-only" htmlFor={compact ? "compact-security-search" : "security-search"}>Search for a listed company</label>
        <input
          id={compact ? "compact-security-search" : "security-search"}
          value={query}
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={compact ? "Start another company lesson…" : "Choose a company or ticker — e.g. NVDA, DBS, 0700.HK"}
          autoComplete="off"
        />
        <button type="submit" aria-label="Open guided lesson for entered symbol">{loading ? <LoaderCircle className="spin" /> : <ArrowUpRight />}</button>
      </form>
      {open && query.trim() && (
        <div className="search-results">
          {results.map((result) => (
            <button key={`${result.symbol}-${result.exchange}`} onClick={() => openLesson(result.symbol)}>
              <span><strong>{result.symbol}</strong><small>{result.exchange}</small></span>
              <span><b>{result.name}</b><small>{result.currency} · {result.type}</small></span>
              <ArrowUpRight />
            </button>
          ))}
          {!loading && (
            <button className="direct-symbol" onClick={() => openLesson(query.trim())}>
              <span><strong>{query.toUpperCase()}</strong><small>Exact symbol</small></span>
              <span><b>Begin with available public data</b><small>Coverage is checked before any model runs</small></span>
              <ArrowUpRight />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
