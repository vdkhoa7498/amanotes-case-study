/** Horizontal rules with centered label (common OAuth / email pattern). */
export function AuthOrDivider({ text = 'hoặc' }: { text?: string }) {
  return (
    <div
      className="my-6 flex items-center gap-3"
      role="separator"
      aria-label={text}
    >
      <div className="h-px flex-1 bg-slate-700/90" />
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        {text}
      </span>
      <div className="h-px flex-1 bg-slate-700/90" />
    </div>
  )
}
