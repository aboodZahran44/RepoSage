"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, Clock, GitBranch, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ApiError, indexRepo, withSlowNotice } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Logo } from "@/components/Logo";
import { getRecentRepos, RecentRepo } from "@/lib/recent-repos";

const URL_PATTERN = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+\/?$/i;

export function IndexRepoForm({
  onStarted,
  onResume,
}: {
  onStarted: (repoId: string, githubUrl: string) => void;
  onResume: (repoId: string, githubUrl: string) => void;
}) {
  const { token, username, logout } = useAuth();
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isSlow, setIsSlow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentRepo[]>([]);

  useEffect(() => {
    setRecent(getRecentRepos());
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    const trimmed = url.trim();
    if (!URL_PATTERN.test(trimmed)) {
      setError("Enter a valid GitHub repository URL, e.g. https://github.com/psf/requests");
      return;
    }

    setSubmitting(true);
    setIsSlow(false);
    setError(null);
    try {
      const res = await withSlowNotice(
        () => indexRepo(token, trimmed),
        () => setIsSlow(true),
      );
      onStarted(res.repo_id, trimmed);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to start indexing. Please try again.");
    } finally {
      setSubmitting(false);
      setIsSlow(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
        <Logo />
        <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
          <span>{username}</span>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
          >
            <LogOut className="size-3.5" />
            Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg animate-fade-in">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
              Index a repository
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Point RepoSage at any public GitHub repo. It&apos;ll clone, parse, and embed the
              codebase so you can ask questions, triage issues, and review diffs.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-5 shadow-2xl shadow-black/40 backdrop-blur"
          >
            <label htmlFor="github_url" className="mb-1.5 block text-xs font-medium text-[var(--muted-strong)]">
              GitHub repository URL
            </label>
            <div className="relative">
              <GitBranch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                id="github_url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/psf/requests"
                className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--background-elevated)] py-2.5 pl-9 pr-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
              />
            </div>

            {error && <ErrorNotice message={error} className="mt-3" />}
            {isSlow && !error && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <Clock className="size-3.5 shrink-0" />
                The backend is waking up from sleep — this can take up to ~50 seconds.
              </p>
            )}

            <Button type="submit" loading={submitting} disabled={!url.trim()} className="mt-4 w-full">
              {submitting ? "Starting…" : "Index repository"}
              {!submitting && <ArrowRight className="size-4" />}
            </Button>
          </form>

          {recent.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                Recently indexed
              </p>
              <div className="flex flex-col gap-2">
                {recent.map((r) => (
                  <button
                    key={r.repo_id}
                    onClick={() => onResume(r.repo_id, r.github_url)}
                    className="group flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface)]/60 px-3.5 py-2.5 text-left text-sm transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]"
                  >
                    <span className="truncate text-[var(--muted-strong)] group-hover:text-[var(--foreground)]">
                      {r.github_url.replace(/^https?:\/\/(www\.)?github\.com\//, "")}
                    </span>
                    <ArrowRight className="size-3.5 shrink-0 text-[var(--muted)] opacity-0 transition group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
