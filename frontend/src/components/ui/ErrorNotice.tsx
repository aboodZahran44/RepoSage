import { AlertTriangle } from "lucide-react";

export function ErrorNotice({ message, className }: { message: string; className?: string }) {
  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border border-[rgba(251,113,133,0.3)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)] ${className ?? ""}`}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <p className="leading-relaxed">{message}</p>
    </div>
  );
}
