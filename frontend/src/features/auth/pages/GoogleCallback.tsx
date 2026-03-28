import { useEffect, useMemo } from 'react'
import { Button, Card, Flex, Result, Spin, Typography } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function parseOAuthTokensFromHash(): {
  access: string
  refresh: string
} | null {
  const hash = window.location.hash.replace(/^#/, '')
  const params = new URLSearchParams(hash)
  const access = params.get('access_token')
  const refresh = params.get('refresh_token')
  if (access && refresh) return { access, refresh }
  return null
}

const GOOGLE_CALLBACK_ERROR =
  'Không nhận được mã đăng nhập từ Google. Hãy thử lại.'

export function GoogleCallback() {
  const navigate = useNavigate()
  const { setTokens } = useAuth()
  const tokens = useMemo(() => parseOAuthTokensFromHash(), [])

  useEffect(() => {
    if (!tokens) return
    setTokens(tokens.access, tokens.refresh)
    window.history.replaceState(null, '', window.location.pathname)
    navigate('/', { replace: true })
  }, [navigate, setTokens, tokens])

  if (!tokens) {
    return (
      <Card>
        <div className="flex min-h-[220px] flex-col items-center justify-center py-4">
          <Result
            status="error"
            title="Đăng nhập chưa hoàn tất"
            subTitle={
              <span className="text-slate-400">{GOOGLE_CALLBACK_ERROR}</span>
            }
            className="!pb-0"
            extra={
              <Link to="/login">
                <Button
                  type="primary"
                  size="large"
                  className="!mt-2 !font-semibold"
                >
                  Về trang đăng nhập
                </Button>
              </Link>
            }
          />
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <Flex
        align="center"
        justify="center"
        gap="large"
        className="min-h-[220px] py-8"
        vertical
      >
        <Spin size="large" />
        <div className="text-center">
          <Typography.Text className="!block !text-base !text-slate-200">
            Đang hoàn tất đăng nhập…
          </Typography.Text>
          <Typography.Text type="secondary" className="!mt-1 !block !text-sm">
            Chỉ vài giây, vui lòng không đóng trang.
          </Typography.Text>
        </div>
      </Flex>
    </Card>
  )
}
