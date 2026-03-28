import { Typography } from 'antd'
import type { ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'

type Props = {
  title: string
  description?: ReactNode
  className?: string
}

export function AuthPageHeader({ title, description, className }: Props) {
  return (
    <header className={twMerge('py-6 flex flex-col items-center', className)}>
      <Typography.Title level={3}>{title}</Typography.Title>
      {description ? (
        <Typography.Paragraph type="secondary">
          {description}
        </Typography.Paragraph>
      ) : null}
    </header>
  )
}
