import { useQuery } from '@tanstack/react-query'
import { AppErrorBoundary } from './AppErrorBoundary'
import {
  Avatar,
  Button,
  Dropdown,
  Flex,
  Layout as AntLayout,
  Menu,
  Typography,
} from 'antd'
import { useMemo, useState } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth, type AuthUser } from '../../features/auth'
import { fetchPointsSummary } from '../../features/kudos/api/kudos-api'
import { CreateKudoModal } from '../../features/kudos/components/CreateKudoModal'
import { KudosSearchModal } from '../../features/kudos/components/KudosSearchModal'
import { APP_BRAND_NAME } from '../constants/app'
import { queryKeys } from '../lib/query-keys'
import { NotificationBell } from './NotificationBell'

const { Header, Content } = AntLayout

function userDisplayName(user: AuthUser): string {
  const n = user.fullName?.trim()
  if (n) return n
  return user.email
}

function userInitial(user: AuthUser): string {
  const n = user.fullName?.trim()
  if (n) return n.slice(0, 1).toUpperCase()
  return user.email.slice(0, 1).toUpperCase()
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [createOpen, setCreateOpen] = useState(false)

  const { data: points } = useQuery({
    queryKey: queryKeys.points.summary,
    queryFn: fetchPointsSummary,
    enabled: !!user,
    staleTime: 15_000,
  })

  const menuKey = useMemo(() => {
    if (location.pathname.startsWith('/feed')) return 'feed'
    if (location.pathname.startsWith('/rewards')) return 'rewards'
    return 'dash'
  }, [location.pathname])

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const canSendKudo = (points?.monthlyGivingRemaining ?? 0) > 0

  return (
    <AntLayout className="relative min-h-screen overflow-x-hidden !bg-gradient-to-br from-slate-950 via-indigo-950/30 to-slate-950 text-slate-100">
      {/* Glassmorphism background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-48 -left-48 h-[500px] w-[500px] rounded-full bg-violet-700/20 blur-[140px]" />
        <div className="absolute top-1/3 -right-32 h-96 w-96 rounded-full bg-indigo-600/15 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 h-80 w-80 rounded-full bg-purple-700/15 blur-[100px]" />
      </div>

      <Header className="!h-auto !border-b !border-white/[0.08] !bg-white/[0.04] !px-4 !py-3 !leading-normal backdrop-blur-2xl" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <Flex
          align="center"
          justify="space-between"
          gap={16}
          wrap="wrap"
          style={{ maxWidth: 1200, margin: '0 auto', width: '100%' }}
        >
          <Flex align="center" gap={20} wrap="wrap" flex={1}>
            <Link to="/">
              <Typography.Title level={4} className="!mb-0 !text-violet-400 drop-shadow-[0_0_10px_rgba(167,139,250,0.5)]">
                {APP_BRAND_NAME}
              </Typography.Title>
            </Link>
            <Menu
              mode="horizontal"
              theme="dark"
              selectedKeys={[menuKey]}
              style={{
                flex: 1,
                minWidth: 200,
                border: 'none',
                background: 'transparent',
              }}
              items={[
                { key: 'dash', label: <Link to="/">Dashboard</Link> },
                { key: 'feed', label: <Link to="/feed">Live Kudos Feed</Link> },
                {
                  key: 'rewards',
                  label: <Link to="/rewards">Reward Redemption</Link>,
                },
                ...(user.role === 'admin'
                  ? [{ key: 'admin', label: <Link to="/admin">⚙️ Admin</Link> }]
                  : []),
              ]}
            />
          </Flex>

          <Flex align="center" gap={12} wrap="wrap">
            <KudosSearchModal />
            <Button
              type="primary"
              disabled={!canSendKudo}
              onClick={() => setCreateOpen(true)}
            >
              Gửi kudo
            </Button>
            <NotificationBell />

            <Dropdown
              trigger={['click']}
              placement="bottomRight"
              menu={{
                items: [
                  {
                    key: 'logout',
                    label: 'Đăng xuất',
                    danger: true,
                    onClick: () => logout(),
                  },
                ],
              }}
            >
              <button
                type="button"
                className="flex cursor-pointer items-center gap-3 rounded-lg border-0 bg-transparent py-1 pr-2 pl-1 text-left text-slate-100 transition-colors hover:bg-slate-800/60"
              >
                <Avatar
                  src={user.avatar || undefined}
                  size={40}
                  className="shrink-0 border border-slate-700 bg-violet-600 font-medium text-white"
                >
                  {userInitial(user)}
                </Avatar>
                <span className="max-w-[140px] truncate text-sm font-medium sm:max-w-[200px]">
                  {userDisplayName(user)}
                </span>
              </button>
            </Dropdown>
          </Flex>
        </Flex>
      </Header>
      <Content className="mx-auto w-full max-w-5xl px-4 py-10">
        <AppErrorBoundary>
          <Outlet />
        </AppErrorBoundary>
      </Content>

      <CreateKudoModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </AntLayout>
  )
}
