import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  App,
  Button,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd'
import { useState } from 'react'
import {
  adminCoreValuesApi,
  type AdminCoreValue,
  type UpsertCoreValuePayload,
} from '../api/admin-api'

const QK = ['admin', 'core-values']

export function CoreValuesAdminPage() {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AdminCoreValue | null>(null)
  const [form] = Form.useForm<UpsertCoreValuePayload>()

  const { data: items = [], isPending } = useQuery({
    queryKey: QK,
    queryFn: adminCoreValuesApi.list,
  })

  const saveMut = useMutation({
    mutationFn: (data: UpsertCoreValuePayload) =>
      editing
        ? adminCoreValuesApi.update(editing.id, data)
        : adminCoreValuesApi.create(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK })
      message.success(editing ? 'Đã cập nhật' : 'Đã tạo mới')
      closeModal()
    },
    onError: (e: Error) => message.error(e.message),
  })

  const deleteMut = useMutation({
    mutationFn: adminCoreValuesApi.delete,
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

  function openEdit(item: AdminCoreValue) {
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
          ⭐ Core Values
        </Typography.Title>
        <Button type="primary" onClick={openCreate}>
          + Thêm core value
        </Button>
      </Flex>

      <Table<AdminCoreValue>
        loading={isPending}
        dataSource={items}
        rowKey="id"
        pagination={false}
        columns={[
          { title: 'Tên', dataIndex: 'name', width: 180 },
          { title: 'Slug', dataIndex: 'slug', width: 140, render: (v: string) => <code>{v}</code> },
          { title: 'Mô tả', dataIndex: 'description', ellipsis: true },
          { title: 'Thứ tự', dataIndex: 'sortOrder', width: 80 },
          {
            title: 'Trạng thái',
            dataIndex: 'isActive',
            width: 110,
            render: (v: boolean) => (
              <Tag color={v ? 'green' : 'default'}>{v ? 'Active' : 'Inactive'}</Tag>
            ),
          },
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
                  title="Xoá core value này?"
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
        title={editing ? 'Chỉnh sửa core value' : 'Thêm core value'}
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
          <Form.Item name="name" label="Tên" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="slug"
            label="Slug"
            rules={[
              { required: true },
              { pattern: /^[a-z0-9-]+$/, message: 'Chỉ dùng chữ thường, số và dấu -' },
            ]}
          >
            <Input placeholder="teamwork" />
          </Form.Item>
          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={2} />
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
