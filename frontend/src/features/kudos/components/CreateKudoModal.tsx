import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Button, Flex, Form, Input, Modal, Progress, Select, Slider, Space, Typography } from 'antd'
import { useMemo } from 'react'
import { queryKeys } from '../../../shared/lib/query-keys'
import { currentBudgetMonthLabelVi } from '../../../shared/lib/vietnamese-month-label'
import { userDisplayLabel } from '../../../shared/lib/user-display'
import { useAuth } from '../../auth'
import { fetchUserDirectory } from '../../users/api/users-api'
import { createKudo, fetchCoreValues, fetchPointsSummary } from '../api/kudos-api'
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

  const { data: pointsSummary, isPending: pointsLoading } = useQuery({
    queryKey: queryKeys.points.summary,
    queryFn: fetchPointsSummary,
    enabled: open,
  })

  const monthVi = currentBudgetMonthLabelVi()
  const remainingBudget = pointsSummary?.monthlyGivingRemaining ?? 0
  const budgetCap = pointsSummary?.monthlyGivingCap ?? 0
  const budgetSpent = pointsSummary?.monthlyGivingSpent ?? 0

  const recipientsWatch = Form.useWatch('recipients', form) as RecipientRow[] | undefined
  const totalSelectedPoints = useMemo(
    () =>
      (recipientsWatch ?? []).reduce(
        (s, r) => s + Number(r?.points ?? 0),
        0,
      ),
    [recipientsWatch],
  )

  const overBudget = pointsSummary != null && totalSelectedPoints > remainingBudget
  const noBudgetLeft = pointsSummary != null && remainingBudget <= 0

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
      queryClient.invalidateQueries({ queryKey: queryKeys.kudos.rankingMonthly })
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
      const sumPts = values.recipients.reduce((s, r) => s + (Number(r.points) || 0), 0)
      if (pointsSummary && sumPts > pointsSummary.monthlyGivingRemaining) {
        message.error(
          `Tổng điểm (${sumPts}) vượt ngân sách còn lại (${pointsSummary.monthlyGivingRemaining}).`,
        )
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

  const budgetPercent =
    budgetCap > 0
      ? Math.min(100, Math.round(((budgetCap - remainingBudget) / budgetCap) * 100))
      : 0

  return (
    <Modal
      title={
        <Flex align="center" gap={10}>
          <span className="text-2xl leading-none">✨</span>
          <span
            className="text-lg font-bold"
            style={{
              background: 'linear-gradient(90deg, #a78bfa 0%, #818cf8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Gửi Kudo
          </span>
        </Flex>
      }
      open={open}
      onCancel={onClose}
      destroyOnHidden
      width={560}
      afterOpenChange={(v) => {
        if (v) {
          form.setFieldsValue({
            recipients: [{ points: 10 }],
          })
        }
      }}
      footer={
        <Flex justify="space-between" align="center">
          {pointsSummary && !pointsLoading ? (
            <Typography.Text className="text-xs text-slate-500">
              {overBudget ? (
                <span className="text-rose-400">Vượt ngân sách · đang chọn {totalSelectedPoints} điểm</span>
              ) : noBudgetLeft ? (
                <span className="text-amber-400">Hết ngân sách tháng này</span>
              ) : (
                <span>Còn <strong className="text-violet-300">{remainingBudget}</strong> điểm có thể gửi</span>
              )}
            </Typography.Text>
          ) : <span />}
          <Space>
            <Button onClick={onClose}>Hủy</Button>
            <Button
              type="primary"
              loading={mutation.isPending}
              disabled={pointsLoading || noBudgetLeft || overBudget}
              onClick={handleOk}
              style={{ background: overBudget ? undefined : 'linear-gradient(90deg, #7c3aed, #6366f1)' }}
            >
              Gửi kudo ✨
            </Button>
          </Space>
        </Flex>
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ recipients: [{ points: 10 }] }}
      >
        {/* Budget bar */}
        {pointsLoading ? (
          <div className="mb-4 h-14 animate-pulse rounded-xl bg-white/[0.04]" />
        ) : pointsSummary ? (
          <div className="mb-5 rounded-xl border border-violet-500/20 bg-gradient-to-r from-violet-950/40 to-indigo-950/30 px-4 py-3">
            <Flex justify="space-between" align="center" className="mb-2">
              <Typography.Text className="text-xs font-medium text-slate-400">
                Ngân sách {monthVi}
              </Typography.Text>
              <Typography.Text className="text-xs text-slate-400">
                <span className="font-semibold text-violet-300">{remainingBudget}</span>
                <span className="text-slate-600">/{budgetCap}</span>
                <span className="ml-1 text-slate-600">· đã dùng {budgetSpent}</span>
              </Typography.Text>
            </Flex>
            <Progress
              percent={budgetPercent}
              showInfo={false}
              size={['100%', 6]}
              strokeColor={overBudget ? '#f87171' : { from: '#7c3aed', to: '#6366f1' }}
              trailColor="rgba(255,255,255,0.06)"
            />
          </div>
        ) : null}

        {/* Core value */}
        <Form.Item
          name="coreValueId"
          label="Giá trị cốt lõi"
          rules={[{ required: true, message: 'Chọn giá trị cốt lõi.' }]}
        >
          <Select
            placeholder="Chọn giá trị"
            loading={cvLoading}
            options={coreValues.map((c) => ({ value: c.id, label: `⭐ ${c.name}` }))}
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>

        {/* Message */}
        <Form.Item
          name="description"
          label="Lời nhắn"
          rules={[{ required: true, message: 'Nhập nội dung kudo.' }]}
        >
          <Input.TextArea
            rows={4}
            placeholder="Cảm ơn vì… 💬"
            maxLength={2000}
            showCount
          />
        </Form.Item>

        {/* Recipients */}
        <Form.List
          name="recipients"
          rules={[
            {
              validator: async (_, rows) => {
                if (!rows?.length) {
                  return Promise.reject(new Error('Thêm ít nhất một người nhận.'))
                }
                if (!pointsSummary) return
                const total = rows.reduce(
                  (s: number, r: unknown) =>
                    s + (Number((r as RecipientRow)?.points) || 0),
                  0,
                )
                if (total > pointsSummary.monthlyGivingRemaining) {
                  return Promise.reject(
                    new Error(
                      `Tổng điểm (${total}) không được vượt ngân sách còn lại (${pointsSummary.monthlyGivingRemaining}).`,
                    ),
                  )
                }
              },
            },
          ]}
        >
          {(fields, { add, remove }, { errors }) => (
            <>
              {fields.map((field, index) => {
                const currentPts = Number(recipientsWatch?.[field.name]?.points) || 0
                const totalAll = totalSelectedPoints
                const maxForRow =
                  pointsSummary == null
                    ? POINTS_MAX
                    : Math.min(
                        POINTS_MAX,
                        pointsSummary.monthlyGivingRemaining - totalAll + currentPts,
                      )
                const sliderMax =
                  pointsSummary == null
                    ? POINTS_MAX
                    : maxForRow < POINTS_MIN
                      ? POINTS_MIN
                      : Math.min(POINTS_MAX, maxForRow)
                const sliderDisabled =
                  pointsSummary != null &&
                  (remainingBudget <= 0 || maxForRow < POINTS_MIN)

                return (
                  <div
                    key={field.key}
                    className="mb-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-3 pb-2 pt-3"
                  >
                    <Flex justify="space-between" align="center" className="mb-2">
                      <Typography.Text className="text-xs font-medium text-slate-500">
                        Người nhận #{index + 1}
                      </Typography.Text>
                      {fields.length > 1 ? (
                        <Button
                          type="text"
                          danger
                          size="small"
                          className="!h-auto !p-0 !text-xs"
                          onClick={() => remove(field.name)}
                        >
                          Xóa
                        </Button>
                      ) : null}
                    </Flex>

                    <Form.Item
                      {...field}
                      name={[field.name, 'userId']}
                      rules={[{ required: true, message: 'Chọn người nhận.' }]}
                      style={{ marginBottom: 12 }}
                    >
                      <Select
                        placeholder="Chọn đồng nghiệp"
                        options={userOptions}
                        loading={dirLoading}
                        showSearch
                        optionFilterProp="label"
                      />
                    </Form.Item>

                    <Form.Item
                      name={[field.name, 'points']}
                      label={
                        <Flex justify="space-between" style={{ width: '100%' }}>
                          <span>Điểm tặng</span>
                          <span className="font-semibold text-violet-300">
                            {currentPts} điểm
                          </span>
                        </Flex>
                      }
                      dependencies={['recipients']}
                      rules={[
                        { required: true, message: 'Chọn điểm.' },
                        {
                          type: 'number',
                          min: POINTS_MIN,
                          max: POINTS_MAX,
                          message: `Điểm từ ${POINTS_MIN} đến ${POINTS_MAX}.`,
                        },
                        {
                          validator: async (_, value) => {
                            if (pointsSummary == null || value == null) return
                            const n = Number(value)
                            const rows = form.getFieldValue('recipients') as RecipientRow[]
                            const total =
                              rows?.reduce((s, r, i) => {
                                if (i === field.name) return s + n
                                return s + (Number(r?.points) || 0)
                              }, 0) ?? 0
                            if (total > pointsSummary.monthlyGivingRemaining) {
                              throw new Error(
                                `Vượt ngân sách: tối đa còn ${pointsSummary.monthlyGivingRemaining} điểm.`,
                              )
                            }
                            if (n > maxForRow) {
                              throw new Error(
                                `Tối đa ${maxForRow} điểm với ngân sách hiện tại.`,
                              )
                            }
                          },
                        },
                      ]}
                      style={{ marginBottom: 4 }}
                    >
                      <Slider
                        min={POINTS_MIN}
                        max={sliderMax}
                        step={1}
                        disabled={sliderDisabled}
                        marks={
                          sliderMax <= POINTS_MIN + 10
                            ? { [POINTS_MIN]: `${POINTS_MIN}`, [sliderMax]: `${sliderMax}` }
                            : POINTS_MARKS
                        }
                        tooltip={{ formatter: (v) => (v != null ? `${v} điểm` : '') }}
                      />
                    </Form.Item>

                    {pointsSummary != null && maxForRow < POINTS_MIN ? (
                      <Typography.Text type="danger" className="text-xs">
                        Không đủ ngân sách cho mức tối thiểu {POINTS_MIN} điểm.
                      </Typography.Text>
                    ) : null}
                  </div>
                )
              })}

              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="dashed"
                  onClick={() => add({ points: 10 })}
                  block
                  className="!border-violet-500/30 !text-violet-400 hover:!border-violet-400 hover:!text-violet-300"
                >
                  + Thêm người nhận
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
