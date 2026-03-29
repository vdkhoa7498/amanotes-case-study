import { Flex, Layout as AntLayout, Menu, Typography } from 'antd'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../auth'
import { AppErrorBoundary } from '../../../shared/components/AppErrorBoundary'

const { Sider, Content, Header } = AntLayout

export function AdminLayout() {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'admin') return <Navigate to="/" replace />

  const selectedKey = location.pathname.includes('core-values')
    ? 'core-values'
    : 'rewards'

  return (
    <AntLayout className="h-screen !bg-slate-950">
      <Header className="!bg-slate-900/95 !border-b !border-slate-800 !px-6 !flex !items-center !justify-between">
        <Flex align="center" gap={16}>
          <Link to="/">
            <Typography.Text className="!text-violet-400 font-semibold">
              ← Good Job
            </Typography.Text>
          </Link>
          <Typography.Title level={5} className="!mb-0 !text-slate-100">
            Admin Panel
          </Typography.Title>
        </Flex>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          {user.fullName ?? user.email}
        </Typography.Text>
      </Header>

      <AntLayout>
        <Sider
          width={220}
          className="!bg-slate-900/60 !border-r !border-slate-800"
        >
          <Menu
            mode="inline"
            theme="dark"
            selectedKeys={[selectedKey]}
            style={{
              background: 'transparent',
              borderRight: 'none',
              paddingTop: 16,
            }}
            items={[
              {
                key: 'rewards',
                label: <Link to="/admin/rewards">🎁 Reward Catalog</Link>,
              },
              {
                key: 'core-values',
                label: <Link to="/admin/core-values">⭐ Core Values</Link>,
              },
            ]}
          />
        </Sider>

        <Content className="p-8">
          <AppErrorBoundary>
            <Outlet />
          </AppErrorBoundary>
        </Content>
      </AntLayout>
    </AntLayout>
  )
}
