import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Button, Card, Form, Input, Result, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { authApi } from '../api/auth-api'
import { AuthFormFooter } from '../components/AuthFormFooter'
import { AuthPageHeader } from '../components/AuthPageHeader'
import { FormServerAlert } from '../components/FormServerAlert'

export function ForgotPassword() {
  const [done, setDone] = useState(false)
  const [sentEmail, setSentEmail] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)
  const [form] = Form.useForm<{ email: string }>()

  const forgotMutation = useMutation({
    mutationFn: (body: { email: string }) => authApi.forgotPassword(body),
    onSuccess: (_, variables) => {
      setSentEmail(variables.email)
      setDone(true)
    },
  })

  async function onFinish(values: { email: string }) {
    setServerError(null)
    try {
      await forgotMutation.mutateAsync(values)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Lỗi')
    }
  }

  const loading = forgotMutation.isPending

  if (done) {
    return (
      <Card>
        <div className="text-center">
          <Result
            status="success"
            title="Đã gửi mã OTP"
            subTitle={
              <Typography.Paragraph
                type="secondary"
                className="mx-auto !mb-0 max-w-sm text-pretty"
              >
                Kiểm tra hộp thư{' '}
                <Typography.Text strong className="text-slate-200">
                  {sentEmail}
                </Typography.Text>
                . Dùng mã 6 số để đặt mật khẩu mới.
              </Typography.Paragraph>
            }
            className="!pb-2 [&_.ant-result-subtitle]:!mt-3"
            extra={
              <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link to="/reset-password" state={{ email: sentEmail }}>
                  <Button type="primary">Đặt lại mật khẩu</Button>
                </Link>
                <Link to="/login">Quay lại đăng nhập</Link>
              </div>
            }
          />
        </div>
      </Card>
    )
  }

  return (
    <Card style={{ width: 550 }}>
      <AuthPageHeader
        title="Quên mật khẩu"
        description="Nhập email đã đăng ký — chúng tôi gửi mã OTP để bạn tạo mật khẩu mới."
      />
      <Form<{ email: string }>
        form={form}
        layout="vertical"
        requiredMark={false}
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
        <Form.Item className="!mb-0">
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            block
            size="large"
            className="!h-12 !font-semibold"
          >
            Gửi mã OTP
          </Button>
        </Form.Item>
      </Form>
      <AuthFormFooter>
        <Link to="/login">← Quay lại đăng nhập</Link>
      </AuthFormFooter>
    </Card>
  )
}
