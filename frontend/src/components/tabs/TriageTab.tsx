"use client";

import { FormEvent, useState } from "react";
import { Clock, Database, FileSearch, SearchCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ApiError, triageIssue, withSlowNotice } from "@/lib/api";
import type { ActiveRepo, TriageResult } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ErrorNotice } from "@/components/ui/ErrorNotice";

export function TriageTab({ repo }: { repo: ActiveRepo }) {
  const { token } = useAuth();
  const [issueText, setIssueText] = useState("");
  const [results, setResults] = useState<TriageResult[] | null>(null);
  const [cached, setCached] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSlow, setIsSlow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = issueText.trim();
    if (!trimmed || !token || loading) return;

    setLoading(true);
    setIsSlow(false);
    setError(null);

    try {
      const res = await withSlowNotice(
        () => triageIssue(token, repo.repo_id, trimmed),
        () => setIsSlow(true),
      );
      const sorted = [...res.results].sort((a, b) => b.relevance_score - a.relevance_score);
      setResults(sorted);
      setCached(!!res.cached);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to triage this issue.");
    } finally {
      setLoading(false);
      setIsSlow(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60 p-4 sm:p-5">
        <label htmlFor="issue" className="mb-2 block text-xs font-medium text-[var(--muted-strong)]">
          Bug report or feature request
        </label>
        <textarea
          id="issue"
          value={issueText}
          onChange={(e) => setIssueText(e.target.value)}
          rows={6}
          placeholder="Paste an issue description, e.g. 'Requests hangs indefinitely when the server never sends a response after connecting.'"
          className="w-full resize-y rounded-xl border border-[var(--border-strong)] bg-[var(--background-elevated)] px-3.5 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          {isSlow ? (
            <p className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
              <Clock className="size-3.5 shrink-0" />
              Backend is waking up — up to ~50s on first request.
            </p>
          ) : (
            <span />
          )}
          <Button type="submit" disabled={!issueText.trim()} loading={loading}>
            <SearchCheck className="size-4" />
            {loading ? "Triaging…" : "Triage issue"}
          </Button>
        </div>
      </form>

      {error && <ErrorNotice message={error} />}

      {results && (
        <div className="animate-fade-in">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-[var(--muted-strong)]">
              {results.length} relevant file{results.length === 1 ? "" : "s"}
            </h2>
            {cached && (
              <Badge tone="accent">
                <Database className="size-3" />
                Cached
              </Badge>
            )}
          </div>

          {results.length === 0 ? (
            <EmptyResults />
          ) : (
            <div className="flex flex-col gap-3">
              {results.map((r, i) => (
                <TriageCard key={`${r.file_path}-${i}`} result={r} rank={i + 1} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TriageCard({ result, rank }: { result: TriageResult; rank: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, result.relevance_score)) * 100);
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60 p-4 transition hover:border-[var(--border-strong)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-[var(--surface-active)] text-xs font-medium text-[var(--muted)]">
            {rank}
          </span>
          <code className="break-all font-mono text-sm font-medium text-[var(--foreground)]">
            {result.file_path}
          </code>
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--accent-strong)]">{pct}%</span>
      </div>

      <div className="ml-9 mt-2 h-1.5 max-w-[240px] overflow-hidden rounded-full bg-[var(--surface-active)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--cyan)]"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="ml-9 mt-3 text-sm leading-relaxed text-[var(--muted-strong)]">{result.reasoning}</p>
    </div>
  );
}

function EmptyResults() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-[var(--border)] py-10 text-center">
      <FileSearch className="mb-2 size-6 text-[var(--muted)]" />
      <p className="text-sm text-[var(--muted)]">No plausibly relevant files were found for this issue.</p>
    </div>
  );
}
