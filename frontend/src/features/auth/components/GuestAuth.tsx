import { Spin } from 'antd'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function GuestAuth() {
  const { user, isSessionPending } = useAuth()

  if (isSessionPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <Spin size="large" />
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
