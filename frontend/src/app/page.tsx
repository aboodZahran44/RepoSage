"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type { ActiveRepo } from "@/lib/types";
import { LoginScreen } from "@/components/LoginScreen";
import { IndexRepoForm } from "@/components/IndexRepoForm";
import { IndexingProgress } from "@/components/IndexingProgress";
import { Workspace } from "@/components/Workspace";

type Flow =
  | { step: "index" }
  | { step: "indexing"; repoId: string; githubUrl: string }
  | { step: "workspace"; repo: ActiveRepo };

export default function Home() {
  const { token } = useAuth();
  const [flow, setFlow] = useState<Flow>({ step: "index" });

  if (!token) {
    return <LoginScreen />;
  }

  if (flow.step === "index") {
    return (
      <IndexRepoForm
        onStarted={(repoId, githubUrl) => setFlow({ step: "indexing", repoId, githubUrl })}
        onResume={(repoId, githubUrl) => setFlow({ step: "indexing", repoId, githubUrl })}
      />
    );
  }

  if (flow.step === "indexing") {
    return (
      <IndexingProgress
        repoId={flow.repoId}
        githubUrl={flow.githubUrl}
        onReady={(repoId, githubUrl) => setFlow({ step: "workspace", repo: { repo_id: repoId, github_url: githubUrl } })}
        onBack={() => setFlow({ step: "index" })}
      />
    );
  }

  return <Workspace repo={flow.repo} onSwitchRepo={() => setFlow({ step: "index" })} />;
}
