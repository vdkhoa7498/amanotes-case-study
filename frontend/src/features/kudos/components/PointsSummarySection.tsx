import { useQuery } from '@tanstack/react-query'
import { Card, Col, Progress, Row, Skeleton, Statistic, Typography } from 'antd'
import { Link } from 'react-router-dom'
import { queryKeys } from '../../../shared/lib/query-keys'
import { currentBudgetMonthLabelVi } from '../../../shared/lib/vietnamese-month-label'
import { fetchPointsSummary } from '../api/kudos-api'

function cardClassName() {
  return [
    'h-full border-slate-700/70 bg-slate-900/40 shadow-sm',
    'transition-colors hover:border-violet-500/25',
  ].join(' ')
}

export function PointsSummarySection() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: queryKeys.points.summary,
    queryFn: fetchPointsSummary,
  })

  if (isPending) {
    return <Skeleton active paragraph={{ rows: 4 }} className="mb-2" />
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
  const monthVi = currentBudgetMonthLabelVi()

  const kudosReceivedCount = data.kudosReceivedCount ?? 0
  const rewardRedemptionsCount = data.rewardRedemptionsCount ?? 0
  const uniqueShoutoutSenderCount = data.uniqueShoutoutSenderCount ?? 0

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={8}>
        <Card size="small" className={cardClassName()} styles={{ body: { padding: 20 } }}>
          <Typography.Text type="secondary" className="mb-1 block text-xs uppercase tracking-wide">
            Số dư điểm
          </Typography.Text>
          <Statistic
            value={data.balance}
            valueStyle={{
              fontSize: 32,
              fontWeight: 600,
              color: '#f8fafc',
              lineHeight: 1.2,
            }}
          />
          <div className="mt-4 border-t border-slate-700/60 pt-3 text-[13px] leading-relaxed text-slate-400">
            <div>
              <span className="text-slate-500">Đã nhận:</span>{' '}
              <span className="text-slate-300">
                {kudosReceivedCount} lượt kudo
              </span>
              <span className="text-slate-600"> · </span>
              <span className="text-slate-400">{data.totalReceivedFromKudos} điểm tích lũy</span>
            </div>
            <div className="mt-1">
              <span className="text-slate-500">Đổi thưởng:</span>{' '}
              <span className="text-slate-300">{rewardRedemptionsCount} lần</span>
            </div>
          </div>
        </Card>
      </Col>

      <Col xs={24} md={8}>
        <Card size="small" className={cardClassName()} styles={{ body: { padding: 20 } }}>
          <Typography.Text type="secondary" className="mb-1 block text-xs uppercase tracking-wide">
            Cho điểm & ngân sách
          </Typography.Text>
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <Statistic
              value={data.totalGivenViaKudos}
              suffix="điểm"
              valueStyle={{
                fontSize: 28,
                fontWeight: 600,
                color: '#e2e8f0',
              }}
            />
            <Typography.Text type="secondary" className="text-xs">
              đã cho (toàn thời gian)
            </Typography.Text>
          </div>
          <div className="mt-4 border-t border-slate-700/60 pt-3">
            <div className="mb-2 flex items-baseline justify-between gap-2 text-[13px]">
              <span className="text-slate-400">Ngân sách {monthVi}</span>
              <span className="text-slate-200">
                <strong>{data.monthlyGivingRemaining}</strong>
                <span className="text-slate-500"> / {data.monthlyGivingCap}</span>
              </span>
            </div>
            <Progress
              percent={pct}
              size="small"
              showInfo={false}
              strokeColor={{ from: '#7c3aed', to: '#a78bfa' }}
              trailColor="rgba(51, 65, 85, 0.5)"
            />
            <Typography.Text type="secondary" className="mt-2 block text-xs">
              Đã dùng {data.monthlyGivingSpent} trong tháng
            </Typography.Text>
          </div>
        </Card>
      </Col>

      <Col xs={24} md={8}>
        <Card size="small" className={cardClassName()} styles={{ body: { padding: 20 } }}>
          <Typography.Text type="secondary" className="mb-1 block text-xs uppercase tracking-wide">
            Người đã shout-out bạn
          </Typography.Text>
          <Statistic
            value={uniqueShoutoutSenderCount}
            suffix="người"
            valueStyle={{
              fontSize: 32,
              fontWeight: 600,
              color: '#f8fafc',
              lineHeight: 1.2,
            }}
          />
          <Typography.Text type="secondary" className="mt-3 block text-[13px] leading-relaxed">
            Số đồng nghiệp khác nhau đã gửi kudo tới bạn (bài hiển thị trên feed).
          </Typography.Text>
          <Link
            to="/feed"
            className="mt-3 inline-block text-[13px] text-violet-400 hover:text-violet-300"
          >
            Xem bảng tin →
          </Link>
        </Card>
      </Col>
    </Row>
  )
}
