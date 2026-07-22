import type {
  AskResponse,
  IndexRepoResponse,
  LoginResponse,
  RepoStatusResponse,
  ReviewResponse,
  TriageResponse,
} from "./types";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, options);
  } catch {
    throw new ApiError(
      "Could not reach the RepoSage API. The free-tier backend may be waking up from sleep — please try again in a moment.",
      0,
    );
  }

  if (!res.ok) {
    let detail = res.statusText || "Request failed";
    try {
      const data = await res.json();
      if (typeof data?.detail === "string") detail = data.detail;
    } catch {
      // response body wasn't JSON; fall back to statusText
    }
    throw new ApiError(detail, res.status);
  }

  return res.json() as Promise<T>;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

function jsonHeaders(token?: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    ...(token ? authHeaders(token) : {}),
  };
}

export function login(username: string, password: string): Promise<LoginResponse> {
  const body = new URLSearchParams();
  body.set("username", username);
  body.set("password", password);

  return request<LoginResponse>("/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
}

export function indexRepo(token: string, githubUrl: string): Promise<IndexRepoResponse> {
  return request<IndexRepoResponse>("/repos/index", {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({ github_url: githubUrl }),
  });
}

export function getRepoStatus(repoId: string): Promise<RepoStatusResponse> {
  return request<RepoStatusResponse>(`/repos/${repoId}/status`);
}

export function askQuestion(token: string, repoId: string, query: string): Promise<AskResponse> {
  return request<AskResponse>(`/repos/${repoId}/ask`, {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({ query }),
  });
}

export function triageIssue(token: string, repoId: string, issueText: string): Promise<TriageResponse> {
  return request<TriageResponse>(`/repos/${repoId}/triage`, {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({ issue_text: issueText }),
  });
}

export function reviewDiff(token: string, repoId: string, diffText: string): Promise<ReviewResponse> {
  return request<ReviewResponse>(`/repos/${repoId}/review`, {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({ diff_text: diffText }),
  });
}

/**
 * Runs a promise-returning call and invokes `onSlow` if it hasn't settled
 * after `delayMs` — used to surface cold-start messaging for the free-tier backend.
 */
export async function withSlowNotice<T>(
  fn: () => Promise<T>,
  onSlow: () => void,
  delayMs = 4000,
): Promise<T> {
  const timer = setTimeout(onSlow, delayMs);
  try {
    return await fn();
  } finally {
    clearTimeout(timer);
  }
}
