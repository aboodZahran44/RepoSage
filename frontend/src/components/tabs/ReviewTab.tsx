"use client";

import { FormEvent, useState } from "react";
import { Clock, Database, FileCode2, Info, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/lib/auth-context";
import { ApiError, reviewDiff, withSlowNotice } from "@/lib/api";
import type { ActiveRepo, ReviewFlag, ReviewSeverity } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ErrorNotice } from "@/components/ui/ErrorNotice";

const SEVERITY_ORDER: Record<ReviewSeverity, number> = { concern: 0, warning: 1, info: 2 };

const SEVERITY_META: Record<
  ReviewSeverity,
  { label: string; tone: "danger" | "warning" | "info"; icon: typeof Info; border: string; bg: string; iconColor: string }
> = {
  concern: {
    label: "Concern",
    tone: "danger",
    icon: ShieldAlert,
    border: "border-l-[var(--danger)]",
    bg: "bg-[var(--danger-soft)]",
    iconColor: "text-[var(--danger)]",
  },
  warning: {
    label: "Warning",
    tone: "warning",
    icon: TriangleAlert,
    border: "border-l-[var(--warning)]",
    bg: "bg-[var(--warning-soft)]",
    iconColor: "text-[var(--warning)]",
  },
  info: {
    label: "Info",
    tone: "info",
    icon: Info,
    border: "border-l-[var(--info)]",
    bg: "bg-[var(--info-soft)]",
    iconColor: "text-[var(--info)]",
  },
};

export function ReviewTab({ repo }: { repo: ActiveRepo }) {
  const { token } = useAuth();
  const [diffText, setDiffText] = useState("");
  const [flags, setFlags] = useState<ReviewFlag[] | null>(null);
  const [cached, setCached] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSlow, setIsSlow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = diffText.trim();
    if (!trimmed || !token || loading) return;

    setLoading(true);
    setIsSlow(false);
    setError(null);

    try {
      const res = await withSlowNotice(
        () => reviewDiff(token, repo.repo_id, trimmed),
        () => setIsSlow(true),
      );
      const sorted = [...res.flags].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
      setFlags(sorted);
      setCached(!!res.cached);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to review this diff.");
    } finally {
      setLoading(false);
      setIsSlow(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/60 p-4 sm:p-5">
        <label htmlFor="diff" className="mb-2 block text-xs font-medium text-[var(--muted-strong)]">
          Proposed diff
        </label>
        <textarea
          id="diff"
          value={diffText}
          onChange={(e) => setDiffText(e.target.value)}
          rows={10}
          placeholder={"diff --git a/app/foo.py b/app/foo.py\n@@ -1,3 +1,6 @@\n..."}
          className="w-full resize-y rounded-xl border border-[var(--border-strong)] bg-[var(--background-elevated)] px-3.5 py-3 font-mono text-xs leading-relaxed text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
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
          <Button type="submit" disabled={!diffText.trim()} loading={loading}>
            <ShieldCheck className="size-4" />
            {loading ? "Reviewing…" : "Review diff"}
          </Button>
        </div>
      </form>

      {error && <ErrorNotice message={error} />}

      {flags && (
        <div className="animate-fade-in">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-[var(--muted-strong)]">
              {flags.length} flag{flags.length === 1 ? "" : "s"}
            </h2>
            {cached && (
              <Badge tone="accent">
                <Database className="size-3" />
                Cached
              </Badge>
            )}
          </div>

          {flags.length === 0 ? (
            <EmptyFlags />
          ) : (
            <div className="flex flex-col gap-3">
              {flags.map((f, i) => (
                <FlagCard key={i} flag={f} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FlagCard({ flag }: { flag: ReviewFlag }) {
  const meta = SEVERITY_META[flag.severity];
  const Icon = meta.icon;
  return (
    <div
      className={clsx(
        "rounded-2xl rounded-l-md border border-[var(--border)] border-l-4 p-4 sm:p-5",
        meta.border,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={clsx("flex size-6 items-center justify-center rounded-md", meta.bg)}>
            <Icon className={clsx("size-3.5", meta.iconColor)} />
          </span>
          <Badge tone={meta.tone}>{meta.label}</Badge>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-[var(--foreground)]">{flag.description}</p>

      {flag.related_file && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-[var(--muted)]">
          <FileCode2 className="size-3.5 shrink-0" />
          <code className="break-all font-mono">{flag.related_file}</code>
        </div>
      )}
    </div>
  );
}

function EmptyFlags() {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-[var(--border)] py-10 text-center">
      <ShieldCheck className="mb-2 size-6 text-[var(--success)]" />
      <p className="text-sm text-[var(--muted)]">No issues flagged — this diff looks clean.</p>
    </div>
  );
}
