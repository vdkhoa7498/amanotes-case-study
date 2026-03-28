import { Button } from 'antd'
import type { ReactNode } from 'react'

type Props = {
  href: string
  children: ReactNode
}

/** “Sign in with Google” style button: light background, touch-friendly height. */
export function GoogleOAuthButton({ href, children }: Props) {
  return (
    <a href={href} className="block w-full no-underline" tabIndex={-1}>
      <Button
        block
        htmlType="button"
        type="default"
        className="!flex !h-12 !items-center !justify-center !gap-2.5 !rounded-xl !border-slate-500/80 !bg-white !px-4 !font-medium !text-slate-900 shadow-sm transition-shadow hover:!border-slate-400 hover:!bg-slate-50 hover:!text-slate-900 hover:shadow-md"
      >
        {children}
      </Button>
    </a>
  )
}
