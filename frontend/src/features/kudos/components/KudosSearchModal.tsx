import { useQuery } from '@tanstack/react-query'
import {
  Avatar,
  Button,
  Flex,
  Input,
  List,
  Modal,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { queryKeys } from '../../../shared/lib/query-keys'
import { searchKudosSemantic, type KudoSearchHit } from '../api/kudos-api'

dayjs.extend(relativeTime)
dayjs.locale('vi')

function scoreColor(score: number): string {
  if (score >= 0.85) return '#52c41a'
  if (score >= 0.7) return '#faad14'
  return '#8c8c8c'
}

function HitCard({ hit }: { hit: KudoSearchHit }) {
  return (
    <List.Item style={{ padding: '12px 0' }}>
      <Flex vertical gap={6} style={{ width: '100%' }}>
        <Flex align="center" justify="space-between" wrap="wrap" gap={8}>
          <Flex align="center" gap={8}>
            <Avatar size={28} style={{ background: '#7c3aed', fontSize: 13 }}>
              {hit.senderName.slice(0, 1).toUpperCase()}
            </Avatar>
            <Typography.Text strong style={{ fontSize: 13 }}>
              {hit.senderName}
            </Typography.Text>
            <Tag color="purple" style={{ margin: 0 }}>
              #{hit.coreValueName}
            </Tag>
          </Flex>
          <Flex align="center" gap={8}>
            <Tooltip title="Độ tương đồng ngữ nghĩa">
              <Typography.Text
                style={{ fontSize: 12, color: scoreColor(hit.score) }}
              >
                {Math.round(hit.score * 100)}% match
              </Typography.Text>
            </Tooltip>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {dayjs(hit.createdAt).fromNow()}
            </Typography.Text>
          </Flex>
        </Flex>

        <Typography.Paragraph
          ellipsis={{ rows: 2 }}
          style={{ margin: 0, fontSize: 14 }}
        >
          {hit.description}
        </Typography.Paragraph>

        <Flex align="center" gap={6} wrap="wrap">
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Ghi nhận cho:
          </Typography.Text>
          {hit.recipients.map((r) => (
            <Tag key={r.userId} bordered={false} style={{ margin: 0 }}>
              {r.name} · +{r.points}đ
            </Tag>
          ))}
          <Link
            to={`/feed/${hit.kudoId}`}
            style={{ marginLeft: 'auto', fontSize: 12, color: '#a78bfa' }}
          >
            Xem chi tiết →
          </Link>
        </Flex>
      </Flex>
    </List.Item>
  )
}

export function KudosSearchModal() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')

  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.kudos.aiSearch(query),
    queryFn: () => searchKudosSemantic(query),
    enabled: query.length >= 2,
    staleTime: 60_000,
  })

  function handleSearch() {
    const q = input.trim()
    if (q.length >= 2) setQuery(q)
  }

  function handleClose() {
    setOpen(false)
    setInput('')
    setQuery('')
  }

  return (
    <>
      <Button
        type="text"
        onClick={() => setOpen(true)}
        style={{ color: '#94a3b8' }}
        title="Semantic search"
      >
        🔍 Tìm kiếm AI
      </Button>

      <Modal
        open={open}
        onCancel={handleClose}
        footer={null}
        title="🔍 Tìm kiếm thông minh với AI"
        width={680}
      >
        <Flex vertical gap={16}>
          <Flex gap={8}>
            <Input
              placeholder='Ví dụ: "ai hay khen teamwork tháng này" hoặc "kudo về sáng tạo"'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPressEnter={handleSearch}
              allowClear
              size="large"
            />
            <Button
              type="primary"
              size="large"
              loading={isPending}
              disabled={input.trim().length < 2}
              onClick={handleSearch}
            >
              Tìm
            </Button>
          </Flex>

          {query && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Kết quả tương đồng nhất với:{' '}
              <Typography.Text italic>"{query}"</Typography.Text>
            </Typography.Text>
          )}

          {isError && (
            <Typography.Text type="danger">
              Không thực hiện được tìm kiếm. Kiểm tra OPENAI_API_KEY.
            </Typography.Text>
          )}

          {!isPending && data && data.length === 0 && query && (
            <Typography.Text
              type="secondary"
              style={{
                textAlign: 'center',
                padding: '24px 0',
                display: 'block',
              }}
            >
              Không tìm thấy kudo phù hợp.
            </Typography.Text>
          )}

          {data && data.length > 0 && (
            <List
              dataSource={data}
              renderItem={(hit) => <HitCard hit={hit} />}
              split
            />
          )}

          {!query && (
            <Typography.Text
              type="secondary"
              style={{
                textAlign: 'center',
                padding: '24px 0',
                display: 'block',
                fontSize: 13,
              }}
            >
              Nhập từ khoá để tìm kudos theo ngữ nghĩa — không cần khớp từ chính
              xác.
            </Typography.Text>
          )}
        </Flex>
      </Modal>
    </>
  )
}
