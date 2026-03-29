import { Button, Flex, Result } from 'antd'
import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info.componentStack)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <Flex justify="center" align="center" style={{ minHeight: 320, padding: 32 }}>
          <Result
            status="error"
            title="Đã xảy ra lỗi"
            subTitle={this.state.error?.message ?? 'Vui lòng thử lại.'}
            extra={
              <Button type="primary" onClick={this.handleReset}>
                Thử lại
              </Button>
            }
          />
        </Flex>
      )
    }

    return this.props.children
  }
}
