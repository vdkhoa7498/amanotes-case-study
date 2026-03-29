import { Typography } from 'antd'
import { Link, Outlet } from 'react-router-dom'
import { APP_BRAND_NAME } from '../constants/app'

/** Auth routes: full-screen glassmorphism background + brand; each page supplies its own Card. */
export function AuthLayout() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950/40 to-slate-950 px-4 py-8 text-slate-100">
      {/* Decorative gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-violet-600/25 blur-[120px]" />
        <div className="absolute top-1/2 -right-24 h-80 w-80 rounded-full bg-indigo-500/20 blur-[100px]" />
        <div className="absolute -bottom-20 left-1/3 h-72 w-72 rounded-full bg-purple-700/20 blur-[90px]" />
        <div className="absolute top-1/4 left-1/2 h-48 w-48 rounded-full bg-violet-400/10 blur-[80px]" />
      </div>

      <Link to="/" className="relative z-10 mb-8 shrink-0">
        <Typography.Title level={4} className="!mb-0 !text-violet-400 drop-shadow-[0_0_12px_rgba(167,139,250,0.6)]">
          {APP_BRAND_NAME}
        </Typography.Title>
      </Link>

      <div className="relative z-10 w-full flex flex-col items-center">
        <Outlet />
      </div>
    </div>
  )
}
