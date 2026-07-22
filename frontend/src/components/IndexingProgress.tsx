"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertOctagon, ArrowLeft, Check, Clock, Loader2, RotateCcw } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/lib/auth-context";
import { ApiError, getRepoStatus, indexRepo } from "@/lib/api";
import type { RepoStatus } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { addRecentRepo } from "@/lib/recent-repos";

const POLL_INTERVAL_MS = 3000;
const COLD_START_THRESHOLD_MS = 12000;

const STEPS: { key: RepoStatus; label: string }[] = [
  { key: "pending", label: "Queued" },
  { key: "indexing", label: "Cloning, parsing & embedding code" },
  { key: "ready", label: "Ready" },
];

function stepIndex(status: RepoStatus) {
  return STEPS.findIndex((s) => s.key === status);
}

export function IndexingProgress({
  repoId,
  githubUrl,
  onReady,
  onBack,
}: {
  repoId: string;
  githubUrl: string;
  onReady: (repoId: string, githubUrl: string) => void;
  onBack: () => void;
}) {
  const { token } = useAuth();
  const [activeRepoId, setActiveRepoId] = useState(repoId);
  const [status, setStatus] = useState<RepoStatus>("pending");
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const startRef = useRef(Date.now());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimers = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
  }, []);

  useEffect(() => {
    startRef.current = Date.now();
    setElapsedMs(0);
    setError(null);
    setStatus("pending");

    const poll = async () => {
      try {
        const res = await getRepoStatus(activeRepoId);
        setStatus(res.status);
        if (res.status === "ready") {
          stopTimers();
          addRecentRepo({ repo_id: activeRepoId, github_url: githubUrl, indexedAt: Date.now() });
          onReady(activeRepoId, githubUrl);
        } else if (res.status === "failed") {
          stopTimers();
        }
      } catch (err) {
        stopTimers();
        setError(err instanceof ApiError ? err.message : "Lost connection while checking status.");
      }
    };

    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    tickRef.current = setInterval(() => setElapsedMs(Date.now() - startRef.current), 1000);

    return stopTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRepoId]);

  async function handleRetry() {
    if (!token) return;
    setRetrying(true);
    setError(null);
    try {
      const res = await indexRepo(token, githubUrl);
      setActiveRepoId(res.repo_id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to restart indexing.");
    } finally {
      setRetrying(false);
    }
  }

  const failed = status === "failed";
  const currentStep = stepIndex(status);
  const showColdStart = !failed && elapsedMs > COLD_START_THRESHOLD_MS;

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-16">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-6 text-center">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            {githubUrl.replace(/^https?:\/\/(www\.)?github\.com\//, "")}
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-[var(--foreground)]">
            {failed ? "Indexing failed" : "Indexing repository"}
          </h1>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-6 shadow-2xl shadow-black/40 backdrop-blur">
          {failed ? (
            <div className="flex flex-col items-center py-4 text-center">
              <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-[var(--danger-soft)]">
                <AlertOctagon className="size-6 text-[var(--danger)]" />
              </div>
              <p className="text-sm text-[var(--muted-strong)]">
                Something went wrong while indexing this repository. It may be private, too large,
                or temporarily unavailable.
              </p>
              {error && <ErrorNotice message={error} className="mt-4 w-full text-left" />}
              <div className="mt-5 flex w-full gap-2">
                <Button variant="secondary" onClick={onBack} className="flex-1">
                  <ArrowLeft className="size-4" />
                  Choose another repo
                </Button>
                <Button onClick={handleRetry} loading={retrying} className="flex-1">
                  <RotateCcw className="size-4" />
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <>
              <ol className="space-y-1">
                {STEPS.map((step, i) => {
                  const done = i < currentStep;
                  const active = i === currentStep;
                  return (
                    <li key={step.key} className="flex items-center gap-3 py-2.5">
                      <span
                        className={clsx(
                          "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs transition-colors",
                          done && "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]",
                          active &&
                            "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-strong)] animate-pulse-ring",
                          !done && !active && "border-[var(--border-strong)] text-[var(--muted)]",
                        )}
                      >
                        {done ? (
                          <Check className="size-3.5" />
                        ) : active ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          i + 1
                        )}
                      </span>
                      <span
                        className={clsx(
                          "text-sm transition-colors",
                          active ? "text-[var(--foreground)] font-medium" : "text-[var(--muted)]",
                          done && "text-[var(--muted-strong)]",
                        )}
                      >
                        {step.label}
                      </span>
                    </li>
                  );
                })}
              </ol>

              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-active)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--cyan)] transition-all duration-700 ease-out"
                  style={{ width: `${Math.min(100, ((currentStep + 1) / STEPS.length) * 100)}%` }}
                />
              </div>

              {showColdStart && (
                <p className="mt-4 flex items-start gap-1.5 text-xs leading-relaxed text-[var(--muted)]">
                  <Clock className="mt-0.5 size-3.5 shrink-0" />
                  This is taking a while — the free-tier backend likely spun down from
                  inactivity and is waking up. It can take up to ~50 seconds, then indexing
                  itself may take a bit longer depending on repo size.
                </p>
              )}

              {error && <ErrorNotice message={error} className="mt-4" />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
