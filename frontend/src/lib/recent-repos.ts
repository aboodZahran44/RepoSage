"use client";

export interface RecentRepo {
  repo_id: string;
  github_url: string;
  indexedAt: number;
}

const STORAGE_KEY = "reposage:recent-repos";
const MAX_ENTRIES = 6;

export function getRecentRepos(): RecentRepo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentRepo[];
  } catch {
    return [];
  }
}

export function addRecentRepo(entry: RecentRepo) {
  if (typeof window === "undefined") return;
  const existing = getRecentRepos().filter((r) => r.github_url !== entry.github_url);
  const next = [entry, ...existing].slice(0, MAX_ENTRIES);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
