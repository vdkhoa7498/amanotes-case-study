import { Typography } from 'antd'
import { KudoFeedSection } from '../components/KudoFeedSection'

export function LiveKudosFeedPage() {
  return (
    <div style={{ width: '100%', maxWidth: 680, marginInline: 'auto' }}>
      <Typography.Title level={2} style={{ marginBottom: 16 }}>
        Live Kudos Feed
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        Reaction và bình luận — chọn emoji nhanh hoặc nhập nội dung rồi Gửi.
      </Typography.Paragraph>
      <KudoFeedSection interactive title="Bảng tin" />
    </div>
  )
}
