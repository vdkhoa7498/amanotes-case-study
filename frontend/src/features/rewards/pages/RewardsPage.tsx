import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  App,
  Button,
  Card,
  Flex,
  Image,
  List,
  Skeleton,
  Typography,
} from 'antd'
import { queryKeys } from '../../../shared/lib/query-keys'
import { fetchPointsSummary } from '../../kudos/api/kudos-api'
import { fetchRewardsCatalog, redeemReward } from '../api/rewards-api'

export function RewardsPage() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const {
    data: catalog = [],
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: queryKeys.rewards.catalog,
    queryFn: fetchRewardsCatalog,
  })

  const { data: summary } = useQuery({
    queryKey: queryKeys.points.summary,
    queryFn: fetchPointsSummary,
  })

  const redeemMut = useMutation({
    mutationFn: (rewardItemId: string) => {
      const key =
        globalThis.crypto?.randomUUID?.().replace(/-/g, '') ??
        `${Date.now()}-${Math.random().toString(36).slice(2)}`
      return redeemReward(rewardItemId, key)
    },
    onSuccess: (res) => {
      message.success(
        res.idempotent
          ? 'Yêu cầu đổi đã được ghi nhận trước đó.'
          : 'Đã gửi yêu cầu đổi thưởng.',
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.points.summary })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.rewards.catalog,
      })
    },
    onError: (e: Error) => {
      message.error(e.message || 'Không đổi được thưởng.')
    },
  })

  return (
    <Flex vertical gap={24} style={{ width: '100%' }}>
      <Typography.Title level={2} style={{ margin: 0 }}>
        Reward Redemption
      </Typography.Title>
      <Typography.Text type="secondary">
        Số dư điểm hiện tại:{' '}
        <Typography.Text strong>{summary?.balance ?? '…'}</Typography.Text>
      </Typography.Text>

      {isPending ? <Skeleton active /> : null}
      {isError ? (
        <Typography.Text type="danger">
          {error instanceof Error ? error.message : 'Không tải được danh mục.'}
        </Typography.Text>
      ) : null}

      <List
        grid={{ gutter: 16, xs: 1, sm: 1, md: 2 }}
        dataSource={catalog}
        renderItem={(item) => (
          <List.Item>
            <Card
              title={item.title}
              extra={
                <Typography.Text strong>{item.pointsCost} điểm</Typography.Text>
              }
              style={{ height: 200, width: 300 }}
            >
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt=""
                  style={{
                    maxHeight: 160,
                    objectFit: 'cover',
                    marginBottom: 8,
                  }}
                />
              ) : null}
              <Typography.Paragraph
                type="secondary"
                style={{ marginBottom: 12 }}
              >
                {item.description ?? '—'}
              </Typography.Paragraph>
              <Typography.Text
                type="secondary"
                style={{ display: 'block', marginBottom: 8 }}
              >
                {item.stock === null ? 'Còn hàng' : `Còn lại: ${item.stock}`}
              </Typography.Text>
              <Button
                type="primary"
                loading={redeemMut.isPending}
                disabled={
                  (summary?.balance ?? 0) < item.pointsCost ||
                  (item.stock !== null && item.stock < 1)
                }
                onClick={() => redeemMut.mutate(item.id)}
              >
                Đổi thưởng
              </Button>
            </Card>
          </List.Item>
        )}
      />
    </Flex>
  )
}
