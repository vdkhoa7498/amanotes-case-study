import { useQuery } from '@tanstack/react-query'
import { Card, Col, Progress, Row, Skeleton, Statistic, Typography } from 'antd'
import { queryKeys } from '../../../shared/lib/query-keys'
import { fetchPointsSummary } from '../api/kudos-api'

export function PointsSummarySection() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: queryKeys.points.summary,
    queryFn: fetchPointsSummary,
  })

  if (isPending) {
    return <Skeleton active paragraph={{ rows: 2 }} />
  }

  if (isError) {
    return (
      <Typography.Text type="danger">
        {error instanceof Error
          ? error.message
          : 'Không tải được tóm tắt điểm.'}
      </Typography.Text>
    )
  }

  const pct =
    data.monthlyGivingCap > 0
      ? Math.round((data.monthlyGivingSpent / data.monthlyGivingCap) * 100)
      : 0

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <Card size="small">
          <Statistic title="Số dư điểm" value={data.balance} />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card size="small">
          <Statistic
            title="Đã nhận (kudos)"
            value={data.totalReceivedFromKudos}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card size="small">
          <Statistic title="Đã cho (kudos)" value={data.totalGivenViaKudos} />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Tích lũy cả thời gian, không phải mức 200/tháng.
          </Typography.Text>
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card size="small">
          <Statistic
            title="Ngân sách cho điểm (tháng UTC)"
            value={data.monthlyGivingRemaining}
            suffix={`/ ${data.monthlyGivingCap}`}
          />
          <Progress percent={pct} size="small" showInfo={false} />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Đã dùng trong tháng UTC: {data.monthlyGivingSpent}
          </Typography.Text>
        </Card>
      </Col>
    </Row>
  )
}
