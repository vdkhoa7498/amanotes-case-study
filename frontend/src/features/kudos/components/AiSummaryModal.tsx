import { useQuery } from '@tanstack/react-query'
import { Button, Flex, Modal, Statistic, Tag, Typography } from 'antd'
import { useState } from 'react'
import { queryKeys } from '../../../shared/lib/query-keys'
import { vietnameseMonthFromMonthKey } from '../../../shared/lib/vietnamese-month-label'
import { fetchAiSummary } from '../api/kudos-api'

export function AiSummaryModal() {
  const [open, setOpen] = useState(false)

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.kudos.aiSummary,
    queryFn: fetchAiSummary,
    enabled: open,
    staleTime: 5 * 60_000,
  })

  return (
    <>
      <Button
        type="default"
        onClick={() => setOpen(true)}
        style={{ borderColor: '#7c3aed', color: '#a78bfa' }}
      >
        ✨ AI Summary
      </Button>

      <Modal
        open={open}
        onCancel={() => setOpen(false)}
        footer={[
          <Button key="refresh" onClick={() => void refetch()} loading={isPending}>
            Tạo lại
          </Button>,
          <Button key="close" type="primary" onClick={() => setOpen(false)}>
            Đóng
          </Button>,
        ]}
        title={
          <Flex align="center" gap={8}>
            <span>✨</span>
            <span>AI Monthly Achievement Summary</span>
            {data?.monthKey ? (
              <Tag color="purple">{vietnameseMonthFromMonthKey(data.monthKey)}</Tag>
            ) : null}
          </Flex>
        }
        width={640}
      >
        {isPending ? (
          <Flex vertical gap={12} style={{ padding: '24px 0' }}>
            <Typography.Text type="secondary" style={{ textAlign: 'center', display: 'block' }}>
              Đang phân tích thành tích của bạn với GPT-4o...
            </Typography.Text>
            <div
              style={{
                height: 4,
                borderRadius: 2,
                background: 'linear-gradient(90deg, #7c3aed, #a78bfa, #7c3aed)',
                backgroundSize: '200%',
                animation: 'shimmer 1.5s infinite',
              }}
            />
            <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
          </Flex>
        ) : isError ? (
          <Typography.Text type="danger">
            {error instanceof Error ? error.message : 'Không tạo được summary.'}
          </Typography.Text>
        ) : data ? (
          <Flex vertical gap={20}>
            <Flex gap={32} wrap="wrap">
              <Statistic
                title="Kudo nhận được"
                value={data.kudosCount}
                suffix="kudo"
              />
              <Statistic
                title="Tổng điểm nhận"
                value={data.totalPointsReceived}
                suffix="điểm"
              />
            </Flex>

            <div
              style={{
                background: 'rgba(124,58,237,0.08)',
                border: '1px solid rgba(124,58,237,0.25)',
                borderRadius: 8,
                padding: '16px 20px',
              }}
            >
              <Typography.Paragraph
                style={{ whiteSpace: 'pre-wrap', marginBottom: 0, lineHeight: 1.8 }}
              >
                {data.summary}
              </Typography.Paragraph>
            </div>

            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Được tạo bởi GPT-4o · Chỉ mang tính chất tham khảo
            </Typography.Text>
          </Flex>
        ) : null}
      </Modal>
    </>
  )
}
