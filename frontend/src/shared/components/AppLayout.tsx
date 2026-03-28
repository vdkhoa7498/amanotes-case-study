import { Avatar, Dropdown, Flex, Layout as AntLayout, Typography } from 'antd'
import { Link, Navigate, Outlet } from 'react-router-dom'
import { useAuth, type AuthUser } from '../../features/auth'
import { APP_BRAND_NAME } from '../constants/app'

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

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <AntLayout className="min-h-screen !bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <Header className="!flex !h-auto !items-center !border-b !border-slate-800/80 !bg-slate-950/85 !px-4 !py-3 !leading-normal backdrop-blur-sm">
        <Flex
          align="center"
          justify="space-between"
          gap="middle"
          wrap="wrap"
          className="mx-auto w-full"
        >
          <Link to="/" className="shrink-0">
            <Typography.Title level={4} className="!mb-0 !text-violet-400">
              {APP_BRAND_NAME}
            </Typography.Title>
          </Link>

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
              <span className="max-w-[160px] truncate text-sm font-medium sm:max-w-[220px]">
                {userDisplayName(user)}
              </span>
            </button>
          </Dropdown>
        </Flex>
      </Header>
      <Content className="mx-auto w-full max-w-5xl px-4 py-10">
        <Outlet />
      </Content>
    </AntLayout>
  )
}
