import { useState } from 'react'
import { Button, Flex, Space, Typography } from 'antd'
import { CreateKudoModal } from '../../kudos/components/CreateKudoModal'
import { KudoFeedSection } from '../../kudos/components/KudoFeedSection'
import { PointsSummarySection } from '../../kudos/components/PointsSummarySection'

export function Home() {
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Flex justify="space-between" align="center" wrap="wrap" gap="middle">
        <Typography.Title level={2} style={{ margin: 0 }}>
          Kudos
        </Typography.Title>
        <Button type="primary" onClick={() => setCreateOpen(true)}>
          Gửi kudo
        </Button>
      </Flex>

      <PointsSummarySection />
      <KudoFeedSection />

      <CreateKudoModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </Space>
  )
}
