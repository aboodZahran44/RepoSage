export type RepoStatus = "pending" | "indexing" | "ready" | "failed";

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface IndexRepoResponse {
  repo_id: string;
  status: RepoStatus;
}

export interface RepoStatusResponse {
  repo_id: string;
  status: RepoStatus;
  github_url: string;
}

export interface AskResponse {
  repo_id: string;
  query: string;
  answer: string;
  cached?: boolean;
}

export interface TriageResult {
  file_path: string;
  relevance_score: number;
  reasoning: string;
}

export interface TriageResponse {
  repo_id: string;
  results: TriageResult[];
  cached?: boolean;
}

export type ReviewSeverity = "info" | "warning" | "concern";

export interface ReviewFlag {
  severity: ReviewSeverity;
  description: string;
  related_file: string | null;
}

export interface ReviewResponse {
  repo_id: string;
  flags: ReviewFlag[];
  cached?: boolean;
}

export interface ActiveRepo {
  repo_id: string;
  github_url: string;
}
