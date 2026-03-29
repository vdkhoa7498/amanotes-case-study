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
          borderRadius: 10,
          borderRadiusLG: 14,
          /* Glass base — very transparent so backdrop-filter shows through */
          colorBgContainer: 'rgba(255, 255, 255, 0.04)',
          colorBgElevated: 'rgba(8, 14, 40, 0.72)',
          colorBorder: 'rgba(255, 255, 255, 0.10)',
          colorBorderSecondary: 'rgba(255, 255, 255, 0.06)',
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
          boxShadow:
            '0 4px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
        },
        components: {
          Form: {
            labelColor: '#94a3b8',
            verticalLabelPadding: '0 0 4px',
          },
          /* Inputs stay dark/solid for legibility */
          Input: {
            colorBgContainer: 'rgba(2, 6, 23, 0.92)',
            activeBorderColor: '#7c3aed',
            hoverBorderColor: 'rgba(124, 58, 237, 0.5)',
          },
          InputNumber: {
            colorBgContainer: 'rgba(2, 6, 23, 0.92)',
            activeBorderColor: '#7c3aed',
            hoverBorderColor: 'rgba(124, 58, 237, 0.5)',
          },
          Select: {
            colorBgContainer: 'rgba(2, 6, 23, 0.92)',
            optionSelectedBg: 'rgb(76 29 149 / 0.35)',
          },
          DatePicker: {
            colorBgContainer: 'rgba(2, 6, 23, 0.92)',
            activeBorderColor: '#7c3aed',
          },
          Button: {
            primaryShadow: '0 4px 18px rgba(124, 58, 237, 0.40)',
          },
          Card: {
            colorBgContainer: 'rgba(255, 255, 255, 0.04)',
            colorBorderSecondary: 'rgba(255, 255, 255, 0.08)',
          },
          Modal: {
            contentBg: 'rgba(8, 14, 40, 0.28)',
            headerBg: 'rgba(8, 14, 40, 0)',
            footerBg: 'transparent',
          },
          Table: {
            colorBgContainer: 'transparent',
            headerBg: 'rgba(255, 255, 255, 0.03)',
            rowHoverBg: 'rgba(255, 255, 255, 0.04)',
            borderColor: 'rgba(255, 255, 255, 0.06)',
          },
          Menu: {
            darkItemBg: 'transparent',
            darkSubMenuItemBg: 'transparent',
            darkItemSelectedBg: 'rgba(124, 58, 237, 0.25)',
          },
          Dropdown: {
            colorBgElevated: 'rgba(8, 14, 40, 0.85)',
          },
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  )
}
