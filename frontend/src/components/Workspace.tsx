"use client";

import { useState } from "react";
import { FolderGit2, LogOut, MessageSquare, RefreshCw, SearchCheck, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/lib/auth-context";
import type { ActiveRepo } from "@/lib/types";
import { Logo } from "@/components/Logo";
import { AskTab } from "@/components/tabs/AskTab";
import { TriageTab } from "@/components/tabs/TriageTab";
import { ReviewTab } from "@/components/tabs/ReviewTab";

type TabKey = "ask" | "triage" | "review";

const TABS: { key: TabKey; label: string; icon: typeof MessageSquare }[] = [
  { key: "ask", label: "Ask", icon: MessageSquare },
  { key: "triage", label: "Triage", icon: SearchCheck },
  { key: "review", label: "Review", icon: ShieldCheck },
];

export function Workspace({ repo, onSwitchRepo }: { repo: ActiveRepo; onSwitchRepo: () => void }) {
  const { username, logout } = useAuth();
  const [tab, setTab] = useState<TabKey>("ask");
  const repoLabel = repo.github_url.replace(/^https?:\/\/(www\.)?github\.com\//, "");

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-4">
            <Logo showWordmark={false} />
            <div className="hidden h-6 w-px bg-[var(--border)] sm:block" />
            <div className="flex items-center gap-2 text-sm">
              <FolderGit2 className="size-4 text-[var(--muted)]" />
              <span className="max-w-[220px] truncate font-medium text-[var(--foreground)] sm:max-w-xs" title={repo.github_url}>
                {repoLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSwitchRepo}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--muted-strong)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
            >
              <RefreshCw className="size-3.5" />
              Switch repo
            </button>
            <span className="hidden text-xs text-[var(--muted)] md:inline">{username}</span>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-[var(--muted)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>

        <nav className="mx-auto flex max-w-5xl gap-1 px-4 sm:px-6">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={clsx(
                "relative flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium transition-colors",
                tab === key ? "text-[var(--foreground)]" : "text-[var(--muted)] hover:text-[var(--muted-strong)]",
              )}
            >
              <Icon className="size-4" />
              {label}
              {tab === key && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--cyan)]" />
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6">
        {tab === "ask" && <AskTab repo={repo} />}
        {tab === "triage" && <TriageTab repo={repo} />}
        {tab === "review" && <ReviewTab repo={repo} />}
      </main>
    </div>
  );
}
