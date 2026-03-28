import { Alert } from 'antd'

export function FormServerAlert({ message }: { message: string }) {
  return (
    <Alert
      type="error"
      showIcon
      title={message}
      className="mb-4 rounded-lg"
      role="alert"
      aria-live="polite"
    />
  )
}
