import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Form, Input, Typography } from 'antd'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { queryKeys } from '../../../shared/lib/query-keys'
import { authApi } from '../api/auth-api'
import { AuthFormFooter } from '../components/AuthFormFooter'
import { AuthOrDivider } from '../components/AuthOrDivider'
import { AuthPageHeader } from '../components/AuthPageHeader'
import { FormServerAlert } from '../components/FormServerAlert'
import { GoogleBrandIcon } from '../components/GoogleBrandIcon'
import { GoogleOAuthButton } from '../components/GoogleOAuthButton'
import { useAuth } from '../context/AuthContext'
import { googleOAuthStartUrl } from '../lib/googleAuthUrls'

const LoginStep = {
  PASSWORD: 'PASSWORD',
  OTP: 'OTP',
} as const

export function Login() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const { setTokens } = useAuth()
  const [step, setStep] = useState<(typeof LoginStep)[keyof typeof LoginStep]>(
    LoginStep.PASSWORD,
  )
  const [pendingEmail, setPendingEmail] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)
  const [formPwd] = Form.useForm<{ email: string; password: string }>()
  const [formOtp] = Form.useForm<{ otp: string }>()

  const googleErrorCode = searchParams.get('google_error_code')
  const googleErrorMessage = searchParams.get('google_error_message')

  const googleBanner = useMemo(() => {
    if (!googleErrorMessage?.trim()) return null
    return googleErrorMessage
  }, [googleErrorMessage])

  const loginPwdMutation = useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      authApi.login(body),
  })

  const loginVerifyMutation = useMutation({
    mutationFn: (body: { email: string; otp: string }) =>
      authApi.loginVerify(body),
    onSuccess: async (data) => {
      setTokens(data.accessToken, data.refreshToken)
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
      navigate('/')
    },
  })

  useEffect(() => {
    if (step !== LoginStep.OTP) return
    const id = window.setTimeout(() => {
      const root = document.getElementById('login-otp-panel')
      const input = root?.querySelector<HTMLInputElement>('input')
      input?.focus()
    }, 80)
    return () => window.clearTimeout(id)
  }, [step])

  function clearGoogleOAuthQueryParams() {
    if (!googleErrorCode && !googleErrorMessage) return
    const next = new URLSearchParams(searchParams)
    next.delete('google_error_code')
    next.delete('google_error_message')
    setSearchParams(next, { replace: true })
  }

  async function onPassword(values: { email: string; password: string }) {
    setServerError(null)
    clearGoogleOAuthQueryParams()
    try {
      await loginPwdMutation.mutateAsync(values)
      setPendingEmail(values.email)
      setStep(LoginStep.OTP)
      formOtp.resetFields()
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Lỗi')
    }
  }

  async function onOtp(values: { otp: string }) {
    setServerError(null)
    try {
      await loginVerifyMutation.mutateAsync({
        email: pendingEmail,
        otp: values.otp,
      })
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Lỗi')
    }
  }

  const loadingPwd = loginPwdMutation.isPending
  const loadingOtp = loginVerifyMutation.isPending

  return (
    <Card style={{ width: 550 }}>
      <AuthPageHeader
        title="Đăng nhập"
        description={
          step === LoginStep.PASSWORD
            ? 'Đăng nhập xác thực 2 bước hoặc sử dụng Google'
            : `Nhập mã 6 số đã gửi tới ${pendingEmail}.`
        }
      />

      {googleBanner ? (
        <Alert
          type="warning"
          showIcon
          closable
          title={googleBanner}
          className="mb-4!"
        />
      ) : null}

      {step === LoginStep.PASSWORD ? (
        <>
          <Form<{ email: string; password: string }>
            form={formPwd}
            layout="vertical"
            requiredMark={false}
            onFinish={onPassword}
          >
            {serverError ? <FormServerAlert message={serverError} /> : null}
            <Form.Item
              name="email"
              label="Email công việc"
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
            <Form.Item
              name="password"
              label="Mật khẩu"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
            >
              <Input.Password
                autoComplete="current-password"
                size="large"
                placeholder="••••••••"
              />
            </Form.Item>
            <Form.Item className="!mb-0">
              <Button
                type="primary"
                htmlType="submit"
                loading={loadingPwd}
                block
                size="large"
                className="!h-12 !font-semibold"
              >
                Đăng nhập
              </Button>
            </Form.Item>
          </Form>
          <AuthOrDivider />
          <GoogleOAuthButton href={googleOAuthStartUrl()}>
            <GoogleBrandIcon />
            Tiếp tục với Google
          </GoogleOAuthButton>
        </>
      ) : (
        <div id="login-otp-panel">
          <Form<{ otp: string }>
            form={formOtp}
            layout="vertical"
            requiredMark={false}
            onFinish={onOtp}
          >
            {serverError ? <FormServerAlert message={serverError} /> : null}
            <Typography.Paragraph type="secondary" className="!mb-4 !text-sm">
              Kiểm tra cả mục <strong>Spam</strong> nếu không thấy thư trong vài
              phút.
            </Typography.Paragraph>
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
            <Form.Item className="!mb-0 flex flex-col gap-1">
              <Button
                type="primary"
                htmlType="submit"
                loading={loadingOtp}
                block
                size="large"
                className="!h-12 !font-semibold"
              >
                Đăng nhập
              </Button>
              <Button
                type="link"
                className="!h-auto !py-2 !text-slate-500 hover:!text-slate-300"
                onClick={() => {
                  setStep(LoginStep.PASSWORD)
                  setServerError(null)
                  formOtp.resetFields()
                }}
              >
                ← Quay lại nhập mật khẩu
              </Button>
            </Form.Item>
          </Form>
        </div>
      )}

      <AuthFormFooter>
        Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
        <span className="mx-1.5 text-slate-600">·</span>
        <Link to="/forgot-password">Quên mật khẩu</Link>
      </AuthFormFooter>
    </Card>
  )
}
