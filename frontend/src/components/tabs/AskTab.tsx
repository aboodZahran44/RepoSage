"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Clock, CornerDownLeft, Database, MessageSquareText, Sparkles } from "lucide-react";
import clsx from "clsx";
import { useAuth } from "@/lib/auth-context";
import { ApiError, askQuestion, withSlowNotice } from "@/lib/api";
import type { ActiveRepo } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Markdown } from "@/components/Markdown";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "error";
  content: string;
  cached?: boolean;
}

export function AskTab({ repo }: { repo: ActiveRepo }) {
  const { token } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSlow, setIsSlow] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || !token || loading) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setQuery("");
    setLoading(true);
    setIsSlow(false);

    try {
      const res = await withSlowNotice(
        () => askQuestion(token, repo.repo_id, trimmed),
        () => setIsSlow(true),
      );
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: res.answer, cached: res.cached },
      ]);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Something went wrong answering that question.";
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "error", content: message }]);
    } finally {
      setLoading(false);
      setIsSlow(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-9.5rem)] flex-col">
      <div className="flex-1 overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 p-4 sm:p-6">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-5">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {loading && <ThinkingBubble isSlow={isSlow} />}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex items-end gap-2">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Ask a question about this codebase…"
          rows={1}
          className="max-h-40 min-h-[46px] flex-1 resize-none rounded-xl border border-[var(--border-strong)] bg-[var(--background-elevated)] px-3.5 py-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
        />
        <Button type="submit" disabled={!query.trim()} loading={loading} className="h-[46px] shrink-0">
          <CornerDownLeft className="size-4" />
        </Button>
      </form>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center py-12 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-[var(--accent-soft)]">
        <MessageSquareText className="size-6 text-[var(--accent-strong)]" />
      </div>
      <p className="text-sm font-medium text-[var(--foreground)]">Ask anything about this codebase</p>
      <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">
        Answers are grounded in the actual indexed source — try &quot;How does authentication
        work?&quot; or &quot;Where is the retrieval logic?&quot;
      </p>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[var(--accent)] px-4 py-2.5 text-sm text-white shadow-lg shadow-[var(--accent-soft)]">
          {message.content}
        </div>
      </div>
    );
  }

  if (message.role === "error") {
    return <ErrorNotice message={message.content} />;
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-[var(--border)] bg-[var(--background-elevated)] px-4 py-3">
        {message.cached && (
          <Badge tone="accent" className="mb-2">
            <Database className="size-3" />
            Cached
          </Badge>
        )}
        <Markdown>{message.content}</Markdown>
      </div>
    </div>
  );
}

function ThinkingBubble({ isSlow }: { isSlow: boolean }) {
  return (
    <div className="flex justify-start">
      <div className="flex max-w-[90%] items-center gap-2.5 rounded-2xl rounded-bl-sm border border-[var(--border)] bg-[var(--background-elevated)] px-4 py-3 text-sm text-[var(--muted)]">
        <span className="flex gap-1">
          <span className="size-1.5 animate-bounce rounded-full bg-[var(--accent)] [animation-delay:-0.3s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-[var(--accent)] [animation-delay:-0.15s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-[var(--accent)]" />
        </span>
        <span className={clsx(isSlow && "flex items-center gap-1.5")}>
          {isSlow ? (
            <>
              <Clock className="size-3.5 shrink-0" />
              Waking up the backend — this can take up to ~50s…
            </>
          ) : (
            <>
              <Sparkles className="size-3.5 inline shrink-0 mr-1.5 align-[-2px]" />
              Thinking…
            </>
          )}
        </span>
      </div>
    </div>
  );
}
