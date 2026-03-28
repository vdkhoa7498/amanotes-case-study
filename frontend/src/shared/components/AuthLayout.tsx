import { Typography } from 'antd'
import { Link, Outlet } from 'react-router-dom'
import { APP_BRAND_NAME } from '../constants/app'

/** Auth routes: full-screen background + brand; each page supplies its own Card width. */
export function AuthLayout() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-8 text-slate-100">
      <Link to="/" className="shrink-0 mb-6">
        <Typography.Title level={4} className="!mb-0 !text-violet-400">
          {APP_BRAND_NAME}
        </Typography.Title>
      </Link>
      <Outlet />
    </div>
  )
}
