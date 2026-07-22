import clsx from "clsx";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-[var(--surface-active)] text-[var(--muted-strong)] border-[var(--border-strong)]",
  accent: "bg-[var(--accent-soft)] text-[var(--accent-strong)] border-[rgba(124,108,246,0.35)]",
  success: "bg-[var(--success-soft)] text-[var(--success)] border-[rgba(52,211,153,0.3)]",
  warning: "bg-[var(--warning-soft)] text-[var(--warning)] border-[rgba(251,191,36,0.3)]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)] border-[rgba(251,113,133,0.3)]",
  info: "bg-[var(--info-soft)] text-[var(--info)] border-[rgba(56,189,248,0.3)]",
};

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
