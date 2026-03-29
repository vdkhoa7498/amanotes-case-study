import { useInfiniteQuery } from '@tanstack/react-query'
import {
  Avatar,
  Button,
  Card,
  Divider,
  Flex,
  Radio,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useMemo, useState } from 'react'
import { queryKeys } from '../../../shared/lib/query-keys'
import { userDisplayLabel } from '../../../shared/lib/user-display'
import { fetchKudosFeed } from '../api/kudos-api'
import type { KudoFeedItem, PublicUser } from '../types'

dayjs.extend(relativeTime)
dayjs.locale('vi')

const PAGE_SIZE = 10

function userInitial(u: PublicUser): string {
  const n = u.fullName?.trim()
  if (n) return n.slice(0, 1).toUpperCase()
  return u.email.slice(0, 1).toUpperCase()
}

function mediaStatusColor(status: string): string {
  if (status === 'ready') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'processing') return 'processing'
  return 'default'
}

function mediaStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Chờ xử lý',
    processing: 'Đang xử lý',
    ready: 'Sẵn sàng',
    failed: 'Lỗi',
  }
  return map[status] ?? status
}

function reactionSummary(
  reactions: KudoFeedItem['reactions'],
): [string, number][] {
  const map = new Map<string, number>()
  for (const r of reactions) {
    map.set(r.emoji, (map.get(r.emoji) ?? 0) + 1)
  }
  return [...map.entries()]
}

function FeedPost({ item }: { item: KudoFeedItem }) {
  const reactionRows = reactionSummary(item.reactions)

  return (
    <Card>
      <Flex vertical gap={0}>
        <Flex gap={12} align="flex-start">
          <Avatar src={item.sender.avatar || undefined} size={40}>
            {userInitial(item.sender)}
          </Avatar>
          <Flex vertical style={{ minWidth: 0, flex: 1 }}>
            <Typography.Title level={5} style={{ margin: 0, lineHeight: 1.3 }}>
              {userDisplayLabel(item.sender)}
            </Typography.Title>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {dayjs(item.createdAt).fromNow()}
              {' · '}
              <Typography.Text type="secondary" italic>
                {item.coreValue.name}
              </Typography.Text>
            </Typography.Text>
          </Flex>
        </Flex>

        <Typography.Paragraph
          style={{
            fontSize: 15,
            lineHeight: 1.5,
            marginTop: 12,
            marginBottom: 12,
          }}
        >
          {item.description}
        </Typography.Paragraph>

        <Typography.Text
          type="secondary"
          style={{ fontSize: 13, display: 'block', marginBottom: 6 }}
        >
          Ghi nhận cho
        </Typography.Text>
        <Flex wrap gap={8}>
          {item.recipients.map((r) => (
            <Tag key={r.userId} bordered={false} style={{ marginInlineEnd: 0 }}>
              {`${userDisplayLabel(r.user)} · +${r.points} điểm`}
            </Tag>
          ))}
        </Flex>

        {item.media.length > 0 ? (
          <Flex wrap gap={8} style={{ marginTop: 12 }}>
            {item.media.map((m) => (
              <Tag key={m.id} color={mediaStatusColor(m.processingStatus)}>
                {mediaStatusLabel(m.processingStatus)} · {m.mediaType}
              </Tag>
            ))}
          </Flex>
        ) : null}

        {item.reactions.length > 0 || item.comments.length > 0 ? (
          <Divider style={{ margin: '12px 0' }} />
        ) : null}

        {item.reactions.length > 0 ? (
          <Flex align="center" wrap gap={12}>
            <Space size={4} wrap>
              {reactionRows.map(([emoji, count]) => (
                <Typography.Text key={emoji} style={{ fontSize: 15 }}>
                  {emoji}{' '}
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                    {count}
                  </Typography.Text>
                </Typography.Text>
              ))}
            </Space>
          </Flex>
        ) : null}

        {item.comments.length > 0 ? (
          <>
            {item.reactions.length > 0 ? (
              <Divider style={{ margin: '8px 0' }} />
            ) : null}
            <Typography.Text
              type="secondary"
              style={{ fontSize: 13, display: 'block', marginBottom: 8 }}
            >
              Bình luận · {item.comments.length}
            </Typography.Text>
            <Flex vertical gap={12}>
              {item.comments.map((c) => (
                <Flex key={c.id} gap={10} align="flex-start">
                  <Avatar src={c.author.avatar || undefined} size={32}>
                    {userInitial(c.author)}
                  </Avatar>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <Flex
                      wrap
                      gap={8}
                      align="baseline"
                      style={{ marginBottom: 4 }}
                    >
                      <Typography.Text strong>
                        {userDisplayLabel(c.author)}
                      </Typography.Text>
                      <Typography.Text
                        type="secondary"
                        style={{ fontSize: 12 }}
                      >
                        {dayjs(c.createdAt).fromNow()}
                      </Typography.Text>
                    </Flex>
                    <Typography.Paragraph
                      style={{ marginBottom: 0, fontSize: 15 }}
                    >
                      {c.body}
                    </Typography.Paragraph>
                    {c.media.length > 0 ? (
                      <Flex wrap gap={6} style={{ marginTop: 6 }}>
                        {c.media.map((m) => (
                          <Tag
                            key={m.id}
                            color={mediaStatusColor(m.processingStatus)}
                          >
                            {mediaStatusLabel(m.processingStatus)}
                          </Tag>
                        ))}
                      </Flex>
                    ) : null}
                  </div>
                </Flex>
              ))}
            </Flex>
          </>
        ) : null}
      </Flex>
    </Card>
  )
}

export function KudoFeedSection() {
  const [scope, setScope] = useState<'me' | 'all'>('me')

  const {
    data,
    isPending,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.kudos.feed(scope),
    queryFn: ({ pageParam }) =>
      fetchKudosFeed({ page: pageParam, limit: PAGE_SIZE, scope }),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page < last.totalPages ? last.page + 1 : undefined,
  })

  const items = useMemo(() => data?.pages.flatMap((p) => p.data) ?? [], [data])

  const columnStyle = {
    width: '100%',
    marginInline: 'auto' as const,
  }

  return (
    <Flex vertical gap={16} style={columnStyle}>
      <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Bảng tin kudos
        </Typography.Title>
        <Radio.Group
          value={scope}
          onChange={(e) => setScope(e.target.value)}
          optionType="button"
          buttonStyle="solid"
          options={[
            { label: 'Của tôi', value: 'me' },
            { label: 'Tất cả', value: 'all' },
          ]}
        />
      </Flex>

      {isPending ? (
        <Flex justify="center" style={{ padding: 48 }}>
          <Spin />
        </Flex>
      ) : null}

      {isError ? (
        <Typography.Text type="danger">
          {error instanceof Error ? error.message : 'Không tải được feed.'}
        </Typography.Text>
      ) : null}

      {!isPending && !isError && items.length === 0 ? (
        <Card>
          <Typography.Text type="secondary">
            Chưa có kudo nào trong bảng tin.
          </Typography.Text>
        </Card>
      ) : null}

      {!isPending && !isError
        ? items.map((kudo) => <FeedPost key={kudo.id} item={kudo} />)
        : null}

      {hasNextPage ? (
        <Button
          type="default"
          block
          size="large"
          loading={isFetchingNextPage}
          onClick={() => fetchNextPage()}
        >
          Tải thêm bài viết
        </Button>
      ) : null}
    </Flex>
  )
}
