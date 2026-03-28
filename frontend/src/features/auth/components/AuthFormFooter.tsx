import type { ReactNode } from 'react'

/** Secondary links below the form, separated by a light top border. */
export function AuthFormFooter({ children }: { children: ReactNode }) {
  return (
    <div className="mt-8 border-t border-slate-800/80 pt-6 text-center text-sm leading-relaxed text-slate-500">
      {children}
    </div>
  )
}
