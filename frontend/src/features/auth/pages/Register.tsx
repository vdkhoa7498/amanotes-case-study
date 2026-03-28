import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Button, Card, Col, Divider, Form, Input, Row } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { queryKeys } from '../../../shared/lib/query-keys'
import { authApi, type RegisterRequestBody } from '../api/auth-api'
import { AuthFormFooter } from '../components/AuthFormFooter'
import { AuthPageHeader } from '../components/AuthPageHeader'
import { FormServerAlert } from '../components/FormServerAlert'
import { HrProfileFields } from '../components/HrProfileFields'
import {
  hrProfileDefaultValues,
  hrProfilePayload,
  type HrProfileFormValues,
} from '../lib/hrProfileForm'
import { useAuth } from '../context/AuthContext'

type RegisterStep1Values = HrProfileFormValues & {
  email: string
  password: string
}

const RegisterStep = {
  PROFILE: 'PROFILE',
  OTP: 'OTP',
} as const

export function Register() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { setTokens } = useAuth()
  const [step, setStep] = useState<
    (typeof RegisterStep)[keyof typeof RegisterStep]
  >(RegisterStep.PROFILE)
  const [registerEmail, setRegisterEmail] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)
  const [form1] = Form.useForm<RegisterStep1Values>()
  const [form2] = Form.useForm<{ otp: string }>()

  const registerMutation = useMutation({
    mutationFn: (body: RegisterRequestBody) => authApi.register(body),
  })

  const registerVerifyMutation = useMutation({
    mutationFn: (body: { email: string; otp: string }) =>
      authApi.registerVerify(body),
    onSuccess: async (data) => {
      setTokens(data.accessToken, data.refreshToken)
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.me })
      navigate('/')
    },
  })

  useEffect(() => {
    if (step !== RegisterStep.OTP) return
    const id = window.setTimeout(() => {
      const root = document.getElementById('register-otp-panel')
      const input = root?.querySelector<HTMLInputElement>('input')
      input?.focus()
    }, 80)
    return () => window.clearTimeout(id)
  }, [step])

  async function onStep1(values: RegisterStep1Values) {
    setServerError(null)
    const profile = hrProfilePayload(values)
    const body: RegisterRequestBody = {
      email: values.email,
      password: values.password,
      fullName: profile.fullName,
      employeeCode: profile.employeeCode,
      gender: profile.gender as RegisterRequestBody['gender'],
      dateOfBirth: profile.dateOfBirth,
      avatar: profile.avatar,
    }
    try {
      await registerMutation.mutateAsync(body)
      setRegisterEmail(values.email)
      setStep(RegisterStep.OTP)
      form2.resetFields()
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Lỗi')
    }
  }

  async function onStep2(values: { otp: string }) {
    setServerError(null)
    try {
      await registerVerifyMutation.mutateAsync({
        email: registerEmail,
        otp: values.otp,
      })
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Lỗi')
    }
  }

  const loading1 = registerMutation.isPending
  const loading2 = registerVerifyMutation.isPending

  return (
    <Card style={{ width: step === RegisterStep.PROFILE ? 700 : 550 }}>
      <AuthPageHeader
        title="Tạo tài khoản"
        description={
          step === RegisterStep.PROFILE
            ? 'Thông tin nhân sự giúp đối chiếu nội bộ. Sau đó bạn xác thực email bằng OTP.'
            : `Nhập mã 6 số đã gửi tới ${registerEmail}.`
        }
      />

      {step === RegisterStep.PROFILE ? (
        <Form<RegisterStep1Values>
          form={form1}
          layout="vertical"
          requiredMark={false}
          initialValues={{
            ...hrProfileDefaultValues,
            email: '',
            password: '',
          }}
          onFinish={onStep1}
        >
          {serverError ? <FormServerAlert message={serverError} /> : null}
          <Divider
            plain
            titlePlacement="start"
            className="!mb-4 !border-slate-700 !text-slate-500"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              Email & mật khẩu
            </span>
          </Divider>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
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
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="password"
                label="Mật khẩu"
                extra={
                  <span className="text-xs text-slate-500">
                    Tối thiểu 8 ký tự
                  </span>
                }
                rules={[
                  { required: true, message: 'Vui lòng nhập mật khẩu' },
                  { min: 8, message: 'Tối thiểu 8 ký tự' },
                ]}
              >
                <Input.Password
                  autoComplete="new-password"
                  size="large"
                  placeholder="••••••••"
                />
              </Form.Item>
            </Col>
          </Row>
          <HrProfileFields />
          <Form.Item className="!mb-0">
            <Button
              type="primary"
              htmlType="submit"
              loading={loading1}
              block
              size="large"
            >
              Đăng ký tài khoản
            </Button>
          </Form.Item>
        </Form>
      ) : (
        <div id="register-otp-panel">
          <Form<{ otp: string }>
            form={form2}
            layout="vertical"
            requiredMark={false}
            onFinish={onStep2}
          >
            {serverError ? <FormServerAlert message={serverError} /> : null}
            <Form.Item name="otp" className="flex justify-center">
              <Input.OTP
                length={6}
                size="large"
                type="tel"
                inputMode="numeric"
                autoComplete="one-time-code"
                formatter={(str) => str.replace(/\D/g, '')}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading2}
                block
                size="large"
              >
                Xác thực và đăng nhập
              </Button>
            </Form.Item>
            <Form.Item>
              <Button
                type="link"
                onClick={() => {
                  setStep(RegisterStep.PROFILE)
                  setServerError(null)
                  form2.resetFields()
                }}
              >
                ← Sửa thông tin đã nhập
              </Button>
            </Form.Item>
          </Form>
        </div>
      )}

      <AuthFormFooter>
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </AuthFormFooter>
    </Card>
  )
}
