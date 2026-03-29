import { useQuery } from '@tanstack/react-query'
import { Avatar, Card, Empty, Flex, Skeleton, Table, Typography } from 'antd'
import { queryKeys } from '../../../shared/lib/query-keys'
import { userDisplayLabel } from '../../../shared/lib/user-display'
import { vietnameseMonthFromMonthKey } from '../../../shared/lib/vietnamese-month-label'
import {
  fetchMonthlyRanking,
  type MonthlyRankingEntry,
} from '../../kudos/api/kudos-api'
import { PointsSummarySection } from '../../kudos/components/PointsSummarySection'

const MEDALS = [
  { rank: 1 as const, emoji: '🥇', label: 'Hạng 1' },
  { rank: 2 as const, emoji: '🥈', label: 'Hạng 2' },
  { rank: 3 as const, emoji: '🥉', label: 'Hạng 3' },
]

function userInitial(e: MonthlyRankingEntry['user']): string {
  const n = e.fullName?.trim()
  if (n) return n.slice(0, 1).toUpperCase()
  return e.email.slice(0, 1).toUpperCase()
}

export function DashboardPage() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: queryKeys.kudos.rankingMonthly,
    queryFn: fetchMonthlyRanking,
  })

  const top3 = data?.entries.slice(0, 3) ?? []
  const periodVi = vietnameseMonthFromMonthKey(data?.monthKey)

  return (
    <Flex vertical gap={24} style={{ width: '100%' }}>
      <Typography.Title level={2} style={{ margin: 0 }}>
        Dashboard
      </Typography.Title>

      <PointsSummarySection />

      <Flex
        vertical
        align="center"
        justify="center"
        className="min-h-[min(560px,calc(100vh-14rem))] w-full py-6"
      >
        <Typography.Title
          level={4}
          style={{ marginBottom: 24, marginTop: 0, textAlign: 'center' }}
        >
          Top 3 người điểm cao nhất {periodVi}
        </Typography.Title>

        {isError ? (
          <Typography.Text type="danger" className="mb-4 block text-center">
            {error instanceof Error
              ? error.message
              : 'Không tải được bảng xếp hạng.'}
          </Typography.Text>
        ) : null}

        <Flex
          justify="center"
          align="stretch"
          gap={16}
          wrap="wrap"
          className="w-full max-w-4xl"
        >
          {MEDALS.map((m, i) => {
            const row = top3[i]
            return (
              <Card
                key={m.rank}
                classNames={{ body: '!flex !h-full !min-h-[220px] !flex-col' }}
                className="w-full min-w-[200px] max-w-[280px] flex-1 border-slate-700/80 bg-slate-900/40"
              >
                {isPending ? (
                  <Flex
                    vertical
                    align="center"
                    gap={12}
                    className="flex-1 py-2"
                  >
                    <Skeleton.Avatar active size={56} shape="circle" />
                    <Skeleton active paragraph={{ rows: 2 }} title={false} />
                  </Flex>
                ) : (
                  <Flex
                    vertical
                    align="center"
                    gap={10}
                    className="flex-1 justify-center text-center"
                  >
                    <Typography.Text className="text-5xl! leading-none">
                      {m.emoji}
                    </Typography.Text>
                    <Typography.Text
                      type="secondary"
                      className="text-xs uppercase tracking-wide"
                    >
                      {m.label}
                    </Typography.Text>
                    {isError ? (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="—"
                        className="my-2"
                      />
                    ) : row ? (
                      <>
                        <Avatar
                          src={row.user.avatar || undefined}
                          size={56}
                          className="border border-slate-600"
                        >
                          {userInitial(row.user)}
                        </Avatar>
                        <Typography.Text strong className="block px-1">
                          {userDisplayLabel(row.user)}
                        </Typography.Text>
                        <Typography.Text type="secondary">
                          {row.points} điểm nhận
                        </Typography.Text>
                      </>
                    ) : (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={
                          <span className="text-slate-500">
                            Chưa có dữ liệu
                          </span>
                        }
                        className="my-2"
                      />
                    )}
                  </Flex>
                )}
              </Card>
            )
          })}
        </Flex>
      </Flex>

      <div className="w-full">
        <Typography.Title level={4} style={{ marginBottom: 12 }}>
          Toàn bộ xếp hạng {periodVi}
        </Typography.Title>

        {isPending ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : isError ? (
          <Empty
            description="Không tải được danh sách"
            className="border border-slate-800/80 rounded-lg bg-slate-900/30 py-12"
          />
        ) : data && data.entries.length === 0 ? (
          <Empty
            description="Chưa có ai trong bảng xếp hạng tháng này"
            className="border border-slate-800/80 rounded-lg bg-slate-900/30 py-12"
          />
        ) : data ? (
          <Card
            size="small"
            className="border-slate-700/80 bg-slate-900/30"
            styles={{ body: { padding: 0 } }}
          >
            <Table<MonthlyRankingEntry>
              size="small"
              pagination={false}
              rowKey={(r) => r.user.id}
              dataSource={data.entries}
              columns={[
                {
                  title: '#',
                  dataIndex: 'rank',
                  width: 48,
                },
                {
                  title: 'Thành viên',
                  render: (_, r) => (
                    <Flex align="center" gap={10}>
                      <Avatar src={r.user.avatar || undefined} size={36}>
                        {userInitial(r.user)}
                      </Avatar>
                      {userDisplayLabel(r.user)}
                    </Flex>
                  ),
                },
                {
                  title: 'Điểm nhận',
                  dataIndex: 'points',
                  width: 120,
                },
              ]}
            />
          </Card>
        ) : null}
      </div>
    </Flex>
  )
}
