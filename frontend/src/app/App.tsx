import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, GuestAuth, RequireAuth } from '../features/auth'
import { AppErrorBoundary } from '../shared/components/AppErrorBoundary'
import { Spin } from 'antd'

import { AdminLayout } from '../features/admin/components/AdminLayout'
import { AppLayout } from '../shared/components/AppLayout'
import { AuthLayout } from '../shared/components/AuthLayout'

const Login = lazy(() =>
  import('../features/auth/pages/Login').then((m) => ({ default: m.Login })),
)
const Register = lazy(() =>
  import('../features/auth/pages/Register').then((m) => ({
    default: m.Register,
  })),
)
const ForgotPassword = lazy(() =>
  import('../features/auth/pages/ForgotPassword').then((m) => ({
    default: m.ForgotPassword,
  })),
)
const ResetPassword = lazy(() =>
  import('../features/auth/pages/ResetPassword').then((m) => ({
    default: m.ResetPassword,
  })),
)
const GoogleCallback = lazy(() =>
  import('../features/auth/pages/GoogleCallback').then((m) => ({
    default: m.GoogleCallback,
  })),
)
const DashboardPage = lazy(() =>
  import('../features/dashboard/pages/DashboardPage').then((m) => ({
    default: m.DashboardPage,
  })),
)
const LiveKudosFeedPage = lazy(() =>
  import('../features/kudos/pages/LiveKudosFeedPage').then((m) => ({
    default: m.LiveKudosFeedPage,
  })),
)
const KudoDetailPage = lazy(() =>
  import('../features/kudos/pages/KudoDetailPage').then((m) => ({
    default: m.KudoDetailPage,
  })),
)
const RewardsPage = lazy(() =>
  import('../features/rewards/pages/RewardsPage').then((m) => ({
    default: m.RewardsPage,
  })),
)
const RewardCatalogAdminPage = lazy(() =>
  import('../features/admin/pages/RewardCatalogAdminPage').then((m) => ({
    default: m.RewardCatalogAdminPage,
  })),
)
const CoreValuesAdminPage = lazy(() =>
  import('../features/admin/pages/CoreValuesAdminPage').then((m) => ({
    default: m.CoreValuesAdminPage,
  })),
)

function PageLoader() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 300,
      }}
    >
      <Spin size="large" />
    </div>
  )
}

export default function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route element={<AuthLayout />}>
                <Route element={<GuestAuth />}>
                  <Route path="login" element={<Login />} />
                  <Route path="register" element={<Register />} />
                  <Route path="forgot-password" element={<ForgotPassword />} />
                  <Route path="reset-password" element={<ResetPassword />} />
                </Route>
                <Route
                  path="auth/google/callback"
                  element={<GoogleCallback />}
                />
              </Route>

              <Route element={<RequireAuth />}>
                <Route element={<AppLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="feed" element={<LiveKudosFeedPage />} />
                  <Route path="feed/:kudoId" element={<KudoDetailPage />} />
                  <Route path="rewards" element={<RewardsPage />} />
                </Route>
              </Route>

              <Route element={<RequireAuth />}>
                <Route element={<AdminLayout />}>
                  <Route path="admin/rewards" element={<RewardCatalogAdminPage />} />
                  <Route path="admin/core-values" element={<CoreValuesAdminPage />} />
                  <Route path="admin" element={<Navigate to="/admin/rewards" replace />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  )
}
