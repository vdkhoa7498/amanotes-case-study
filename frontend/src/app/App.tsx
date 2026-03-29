import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, GuestAuth, RequireAuth } from '../features/auth'
import { ForgotPassword } from '../features/auth/pages/ForgotPassword'
import { GoogleCallback } from '../features/auth/pages/GoogleCallback'
import { Login } from '../features/auth/pages/Login'
import { Register } from '../features/auth/pages/Register'
import { ResetPassword } from '../features/auth/pages/ResetPassword'
import { DashboardPage } from '../features/dashboard/pages/DashboardPage'
import { KudoDetailPage } from '../features/kudos/pages/KudoDetailPage'
import { LiveKudosFeedPage } from '../features/kudos/pages/LiveKudosFeedPage'
import { RewardsPage } from '../features/rewards/pages/RewardsPage'
import { AppLayout } from '../shared/components/AppLayout'
import { AuthLayout } from '../shared/components/AuthLayout'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route element={<GuestAuth />}>
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="reset-password" element={<ResetPassword />} />
            </Route>
            <Route path="auth/google/callback" element={<GoogleCallback />} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="feed" element={<LiveKudosFeedPage />} />
              <Route path="feed/:kudoId" element={<KudoDetailPage />} />
              <Route path="rewards" element={<RewardsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
