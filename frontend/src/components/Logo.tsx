import clsx from "clsx";

export function Logo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <div className={clsx("flex items-center gap-2.5", className)}>
      <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--accent)] to-[var(--cyan)] shadow-[0_4px_18px_-4px_rgba(124,108,246,0.7)]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M9.5 5L4 12L9.5 19M14.5 5L20 12L14.5 19"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {showWordmark && (
        <span className="text-[15px] font-semibold tracking-tight text-[var(--foreground)]">
          Repo<span className="text-[var(--accent-strong)]">Sage</span>
        </span>
      )}
    </div>
  );
}
