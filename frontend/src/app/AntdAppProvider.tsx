import { App, ConfigProvider, theme } from 'antd'
import viVN from 'antd/locale/vi_VN'
import type { ReactNode } from 'react'

export function AntdAppProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#7c3aed',
          borderRadius: 8,
          borderRadiusLG: 12,
          colorBgContainer: 'rgb(2 6 23 / 0.5)',
          colorBgElevated: 'rgb(15 23 42 / 0.9)',
          colorBorder: '#334155',
          colorBorderSecondary: '#1e293b',
          colorText: '#f8fafc',
          colorTextSecondary: '#94a3b8',
          colorTextDescription: '#94a3b8',
          colorError: '#f87171',
          colorErrorBg: 'rgb(69 10 10 / 0.45)',
          colorErrorBorder: 'rgb(127 29 29 / 0.5)',
          colorWarning: '#fbbf24',
          colorWarningBg: 'rgb(120 53 15 / 0.35)',
          colorWarningBorder: 'rgb(180 83 9 / 0.45)',
          colorSuccess: '#34d399',
          colorSuccessBg: 'rgb(6 78 59 / 0.35)',
          colorSuccessBorder: 'rgb(16 185 129 / 0.3)',
        },
        components: {
          Form: {
            labelColor: '#94a3b8',
            verticalLabelPadding: '0 0 4px',
          },
          Input: {
            colorBgContainer: 'rgb(2 6 23)',
            activeBorderColor: '#7c3aed',
            hoverBorderColor: '#475569',
          },
          Select: {
            colorBgContainer: 'rgb(2 6 23)',
            optionSelectedBg: 'rgb(76 29 149 / 0.35)',
          },
          Button: {
            primaryShadow: '0 4px 14px rgb(76 29 149 / 0.35)',
          },
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  )
}
