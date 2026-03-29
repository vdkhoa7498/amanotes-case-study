import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  App,
  Button,
  Flex,
  Form,
  InputNumber,
  Modal,
  Popconfirm,
  Switch,
  Table,
  Tag,
  Typography,
  Input,
} from 'antd'
import { useState } from 'react'
import {
  adminRewardsApi,
  type AdminRewardItem,
  type UpsertRewardPayload,
} from '../api/admin-api'

const QK = ['admin', 'rewards']

export function RewardCatalogAdminPage() {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AdminRewardItem | null>(null)
  const [form] = Form.useForm<UpsertRewardPayload>()

  const { data: items = [], isPending } = useQuery({
    queryKey: QK,
    queryFn: adminRewardsApi.list,
  })

  const saveMut = useMutation({
    mutationFn: (data: UpsertRewardPayload) =>
      editing
        ? adminRewardsApi.update(editing.id, data)
        : adminRewardsApi.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK })
      message.success(editing ? 'Đã cập nhật' : 'Đã tạo mới')
      closeModal()
    },
    onError: (e: Error) => message.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: adminRewardsApi.delete,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK })
      message.success('Đã xoá')
    },
    onError: (e: Error) => message.error(e.message),
  })

  function openCreate() {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ isActive: true, sortOrder: 0 })
    setModalOpen(true)
  }

  function openEdit(item: AdminRewardItem) {
    setEditing(item)
    form.setFieldsValue(item)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditing(null)
    form.resetFields()
  }

  return (
    <Flex vertical gap={20}>
      <Flex justify="space-between" align="center">
        <Typography.Title level={3} style={{ margin: 0 }}>
          🎁 Reward Catalog
        </Typography.Title>
        <Button type="primary" onClick={openCreate}>
          + Thêm phần thưởng
        </Button>
      </Flex>

      <Table<AdminRewardItem>
        loading={isPending}
        dataSource={items}
        rowKey="id"
        pagination={false}
        columns={[
          { title: 'Tên', dataIndex: 'title', width: 200 },
          { title: 'Điểm', dataIndex: 'pointsCost', width: 90 },
          {
            title: 'Tồn kho',
            dataIndex: 'stock',
            width: 90,
            render: (v: number | null) => (v === null ? '∞' : v),
          },
          {
            title: 'Trạng thái',
            dataIndex: 'isActive',
            width: 110,
            render: (v: boolean) => (
              <Tag color={v ? 'green' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag>
            ),
          },
          { title: 'Thứ tự', dataIndex: 'sortOrder', width: 80 },
          {
            title: '',
            key: 'actions',
            width: 140,
            render: (_, item) => (
              <Flex gap={8}>
                <Button size="small" onClick={() => openEdit(item)}>
                  Sửa
                </Button>
                <Popconfirm
                  title="Xoá phần thưởng này?"
                  onConfirm={() => deleteMut.mutate(item.id)}
                  okText="Xoá"
                  cancelText="Huỷ"
                >
                  <Button size="small" danger>
                    Xoá
                  </Button>
                </Popconfirm>
              </Flex>
            ),
          },
        ]}
      />

      <Modal
        open={modalOpen}
        onCancel={closeModal}
        title={editing ? 'Chỉnh sửa phần thưởng' : 'Thêm phần thưởng'}
        onOk={() => form.submit()}
        confirmLoading={saveMut.isPending}
        okText="Lưu"
        cancelText="Huỷ"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => saveMut.mutate(v)}
          style={{ marginTop: 16 }}
        >
          <Form.Item name="title" label="Tên" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Flex gap={16}>
            <Form.Item name="pointsCost" label="Điểm đổi" rules={[{ required: true }]} style={{ flex: 1 }}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="stock" label="Tồn kho (trống = vô hạn)" style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} placeholder="Vô hạn" />
            </Form.Item>
          </Flex>
          <Form.Item name="imageUrl" label="Image URL">
            <Input placeholder="https://..." />
          </Form.Item>
          <Flex gap={16}>
            <Form.Item name="sortOrder" label="Thứ tự" style={{ flex: 1 }}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="isActive" label="Active" valuePropName="checked" style={{ flex: 1 }}>
              <Switch />
            </Form.Item>
          </Flex>
        </Form>
      </Modal>
    </Flex>
  )
}
