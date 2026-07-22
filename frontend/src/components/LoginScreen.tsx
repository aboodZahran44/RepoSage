"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, KeyRound, Sparkles, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/Button";
import { ErrorNotice } from "@/components/ui/ErrorNotice";
import { Logo } from "@/components/Logo";

export function LoginScreen() {
  const { login, isLoggingIn, loginError } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!username || !password) return;
    await login(username, password);
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo className="mb-5" />
          <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
            Sign in to RepoSage
          </h1>
          <p className="mt-1.5 text-sm text-[var(--muted)]">
            Codebase intelligence for any GitHub repository
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-6 shadow-2xl shadow-black/40 backdrop-blur"
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="mb-1.5 block text-xs font-medium text-[var(--muted-strong)]">
                Username
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  id="username"
                  name="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--background-elevated)] py-2.5 pl-9 pr-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                  placeholder="admin"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-[var(--muted-strong)]">
                Password
              </label>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--background-elevated)] py-2.5 pl-9 pr-3 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          {loginError && <ErrorNotice message={loginError} className="mt-4" />}

          <Button type="submit" loading={isLoggingIn} className="mt-5 w-full" disabled={!username || !password}>
            {isLoggingIn ? "Signing in…" : "Sign in"}
            {!isLoggingIn && <ArrowRight className="size-4" />}
          </Button>
        </form>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-[var(--muted)]">
          <Sparkles className="size-3.5" />
          First request may take up to ~50s while the backend wakes up.
        </p>
      </div>
    </div>
  );
}
