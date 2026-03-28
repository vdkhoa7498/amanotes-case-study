import type { CardProps } from 'antd'

/** Shared visual shell for auth pages; combine with your own `max-w-*` on each page’s Card. */
export const authCardShellClassName = ''
;('rounded-2xl border border-slate-800/90 bg-slate-900/90 shadow-2xl shadow-black/40 backdrop-blur-md')

export const authCardStyles: CardProps['styles'] = {
  body: {
    padding: '28px 24px',
    overflowY: 'auto',
  },
}
