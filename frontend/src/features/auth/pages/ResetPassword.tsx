import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Button, Card, Form, Input, Typography } from 'antd'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { authApi, type ResetPasswordBody } from '../api/auth-api'
import { AuthFormFooter } from '../components/AuthFormFooter'
import { AuthPageHeader } from '../components/AuthPageHeader'
import { FormServerAlert } from '../components/FormServerAlert'

type LocationState = { email?: string }

type FormValues = {
  email: string
  otp: string
  newPassword: string
}

export function ResetPassword() {
  const navigate = useNavigate()
  const location = useLocation()
  const initialEmail = (location.state as LocationState | null)?.email ?? ''

  const [serverError, setServerError] = useState<string | null>(null)
  const [form] = Form.useForm<FormValues>()

  const resetMutation = useMutation({
    mutationFn: (body: ResetPasswordBody) => authApi.resetPassword(body),
    onSuccess: () => {
      navigate('/login', { replace: true })
    },
  })

  async function onFinish(values: FormValues) {
    setServerError(null)
    try {
      await resetMutation.mutateAsync({
        email: values.email,
        otp: values.otp,
        newPassword: values.newPassword,
      })
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Lỗi')
    }
  }

  const loading = resetMutation.isPending

  return (
    <Card style={{ width: 550 }}>
      <AuthPageHeader
        title="Đặt lại mật khẩu"
        description="Nhập mã 6 số đã gửi tới email của bạn và chọn mật khẩu mới (tối thiểu 8 ký tự)."
      />
      <Form<FormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{ email: initialEmail, otp: '', newPassword: '' }}
        onFinish={onFinish}
      >
        {serverError ? <FormServerAlert message={serverError} /> : null}
        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Vui lòng nhập email' },
            { type: 'email', message: 'Email không hợp lệ' },
          ]}
        >
          <Input
            autoComplete="email"
            size="large"
            placeholder="ten@congty.com"
          />
        </Form.Item>
        <Form.Item name="otp" label="Mã OTP">
          <Input.OTP
            length={6}
            size="large"
            type="tel"
            inputMode="numeric"
            autoComplete="one-time-code"
            formatter={(str) => str.replace(/\D/g, '')}
          />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label="Mật khẩu mới"
          extra={
            <span className="text-xs text-slate-500">Tối thiểu 8 ký tự</span>
          }
          rules={[
            { required: true, message: 'Vui lòng nhập mật khẩu mới' },
            { min: 8, message: 'Tối thiểu 8 ký tự' },
          ]}
        >
          <Input.Password
            autoComplete="new-password"
            size="large"
            placeholder="••••••••"
          />
        </Form.Item>
        <Form.Item className="!mb-0">
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            size="large"
            className="!h-12 !font-semibold"
          >
            Cập nhật mật khẩu
          </Button>
        </Form.Item>
      </Form>
      <AuthFormFooter>
        <Typography.Text type="secondary" className="text-sm">
          Nhớ mật khẩu rồi? <Link to="/login">Đăng nhập</Link>
        </Typography.Text>
      </AuthFormFooter>
    </Card>
  )
}
