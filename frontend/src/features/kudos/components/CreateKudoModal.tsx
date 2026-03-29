import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Button, Flex, Form, Input, Modal, Select, Slider, Space } from 'antd'
import { useMemo } from 'react'
import { queryKeys } from '../../../shared/lib/query-keys'
import { userDisplayLabel } from '../../../shared/lib/user-display'
import { useAuth } from '../../auth'
import { fetchUserDirectory } from '../../users/api/users-api'
import { createKudo, fetchCoreValues } from '../api/kudos-api'
import type { CreateKudoPayload, PublicUser } from '../types'

type RecipientRow = { userId?: string; points?: number }

type FormValues = {
  coreValueId: string
  description: string
  recipients: RecipientRow[]
}

type Props = {
  open: boolean
  onClose: () => void
}

const POINTS_MIN = 10
const POINTS_MAX = 50

const POINTS_MARKS: Record<number, string> = {
  [POINTS_MIN]: `${POINTS_MIN}`,
  30: '30',
  [POINTS_MAX]: `${POINTS_MAX}`,
}

export function CreateKudoModal({ open, onClose }: Props) {
  const { message } = App.useApp()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<FormValues>()

  const { data: coreValues = [], isPending: cvLoading } = useQuery({
    queryKey: queryKeys.kudos.coreValues,
    queryFn: fetchCoreValues,
    enabled: open,
  })

  const { data: directory = [], isPending: dirLoading } = useQuery({
    queryKey: queryKeys.users.directory,
    queryFn: fetchUserDirectory,
    enabled: open,
  })

  const userOptions = useMemo(
    () =>
      directory.map((u: PublicUser) => ({
        value: u.id,
        label: userDisplayLabel(u),
      })),
    [directory],
  )

  const mutation = useMutation({
    mutationFn: (body: CreateKudoPayload) => createKudo(body),
    onSuccess: () => {
      message.success('Đã gửi kudo.')
      queryClient.invalidateQueries({ queryKey: queryKeys.points.summary })
      queryClient.invalidateQueries({ queryKey: ['kudos', 'feed'] })
      form.resetFields()
      onClose()
    },
    onError: (e: Error) => {
      message.error(e.message || 'Không gửi được kudo.')
    },
  })

  const handleOk = () => {
    void form.validateFields().then((values) => {
      const ids = values.recipients.map((r) => r.userId).filter(Boolean) as string[]
      if (new Set(ids).size !== ids.length) {
        message.error('Không được trùng người nhận.')
        return
      }
      if (ids.some((id) => id === user?.id)) {
        message.error('Bạn không thể gửi kudo cho chính mình.')
        return
      }
      const payload: CreateKudoPayload = {
        coreValueId: values.coreValueId,
        description: values.description.trim(),
        recipients: values.recipients.map((r) => ({
          userId: r.userId!,
          points: r.points!,
        })),
      }
      mutation.mutate(payload)
    })
  }

  return (
    <Modal
      title="Gửi kudo"
      open={open}
      onCancel={onClose}
      destroyOnHidden
      afterOpenChange={(v) => {
        if (v) {
          form.setFieldsValue({
            recipients: [{ points: 10 }],
          })
        }
      }}
      footer={
        <Space>
          <Button onClick={onClose}>Hủy</Button>
          <Button type="primary" loading={mutation.isPending} onClick={handleOk}>
            Gửi
          </Button>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          recipients: [{ points: 10 }],
        }}
      >
        <Form.Item
          name="coreValueId"
          label="Giá trị cốt lõi"
          rules={[{ required: true, message: 'Chọn giá trị cốt lõi.' }]}
        >
          <Select
            placeholder="Chọn giá trị"
            loading={cvLoading}
            options={coreValues.map((c) => ({ value: c.id, label: c.name }))}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>
        <Form.Item
          name="description"
          label="Lời nhắn"
          rules={[{ required: true, message: 'Nhập nội dung kudo.' }]}
        >
          <Input.TextArea rows={4} placeholder="Cảm ơn vì…" maxLength={2000} showCount />
        </Form.Item>
        <Form.List
          name="recipients"
          rules={[
            {
              validator: async (_, rows) => {
                if (!rows?.length) {
                  return Promise.reject(new Error('Thêm ít nhất một người nhận.'))
                }
              },
            },
          ]}
        >
          {(fields, { add, remove }, { errors }) => (
            <>
              {fields.map((field) => (
                <Flex key={field.key} vertical gap={8} style={{ marginBottom: 16 }}>
                  <Flex gap={8} align="center" wrap="wrap">
                    <Form.Item
                      {...field}
                      name={[field.name, 'userId']}
                      rules={[{ required: true, message: 'Chọn người nhận.' }]}
                      style={{ flex: 1, minWidth: 200, marginBottom: 0 }}
                    >
                      <Select
                        placeholder="Đồng nghiệp"
                        options={userOptions}
                        loading={dirLoading}
                        showSearch
                        optionFilterProp="label"
                      />
                    </Form.Item>
                    {fields.length > 1 ? (
                      <Button type="link" danger size="small" onClick={() => remove(field.name)}>
                        Xóa
                      </Button>
                    ) : null}
                  </Flex>
                  <Form.Item
                    name={[field.name, 'points']}
                    label="Điểm"
                    rules={[
                      { required: true, message: 'Chọn điểm.' },
                      {
                        type: 'number',
                        min: POINTS_MIN,
                        max: POINTS_MAX,
                        message: `Điểm từ ${POINTS_MIN} đến ${POINTS_MAX}.`,
                      },
                    ]}
                    style={{ marginBottom: 0 }}
                  >
                    <Slider
                      min={POINTS_MIN}
                      max={POINTS_MAX}
                      step={1}
                      marks={POINTS_MARKS}
                      tooltip={{ formatter: (v) => (v != null ? `${v} điểm` : '') }}
                    />
                  </Form.Item>
                </Flex>
              ))}
              <Form.Item>
                <Button type="dashed" onClick={() => add({ points: 10 })} block>
                  Thêm người nhận
                </Button>
              </Form.Item>
              <Form.ErrorList errors={errors} />
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  )
}
