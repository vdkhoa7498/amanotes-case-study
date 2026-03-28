import {
  App,
  Col,
  DatePicker,
  Divider,
  Form,
  Input,
  Row,
  Select,
  Upload,
} from 'antd'
import type { UploadFile } from 'antd/es/upload/interface'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { uploadAvatarFile } from '../../../shared/lib/upload-avatar'

function latestBirthDateForAge18() {
  return dayjs().subtract(18, 'year').startOf('day')
}

const genderOptions = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
]

export function HrProfileFields() {
  const { message } = App.useApp()
  const form = Form.useFormInstance()
  const avatarRaw = Form.useWatch('avatar', form)
  const avatarUrl = typeof avatarRaw === 'string' ? avatarRaw : ''
  const [uploading, setUploading] = useState(false)

  const fileList: UploadFile[] = useMemo(() => {
    if (!avatarUrl) return []
    return [
      {
        uid: '-1',
        name: 'avatar',
        status: 'done',
        url: avatarUrl,
      },
    ]
  }, [avatarUrl])

  const colSpan = { xs: 24, md: 12 }
  const gutter: [number, number] = [16, 16]

  return (
    <>
      <Divider
        plain
        titlePlacement="start"
        className="!mb-4 !mt-0 !border-slate-700 !text-slate-500"
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider">
          Thông tin nhân sự
        </span>
      </Divider>
      <Row gutter={gutter}>
        <Col {...colSpan}>
          <Form.Item
            name="fullName"
            label="Họ và tên"
            rules={[
              { required: true, message: 'Vui lòng nhập họ tên' },
              { min: 2, message: 'Tối thiểu 2 ký tự' },
            ]}
          >
            <Input
              autoComplete="name"
              size="large"
              placeholder="Nguyễn Văn A"
            />
          </Form.Item>
        </Col>
        <Col {...colSpan}>
          <Form.Item
            name="employeeCode"
            label="Mã nhân viên"
            rules={[
              { required: true, message: 'Vui lòng nhập mã nhân viên' },
              { min: 2, message: 'Tối thiểu 2 ký tự' },
            ]}
          >
            <Input autoComplete="off" size="large" placeholder="VD: NV-001" />
          </Form.Item>
        </Col>
        <Col {...colSpan}>
          <Form.Item
            name="gender"
            label="Giới tính"
            rules={[{ required: true, message: 'Vui lòng chọn giới tính' }]}
          >
            <Select
              placeholder="Chọn giới tính"
              options={genderOptions}
              size="large"
            />
          </Form.Item>
        </Col>
        <Col {...colSpan}>
          <Form.Item
            name="dateOfBirth"
            label="Ngày sinh"
            rules={[
              { required: true, message: 'Vui lòng chọn ngày sinh' },
              {
                validator(_: unknown, value: Dayjs | null) {
                  if (value == null || !dayjs.isDayjs(value)) {
                    return Promise.resolve()
                  }
                  const dob = value.startOf('day')
                  const today = dayjs().startOf('day')
                  if (dob.isAfter(today)) {
                    return Promise.reject(
                      new Error('Ngày sinh không được là ngày trong tương lai'),
                    )
                  }
                  if (dob.isAfter(latestBirthDateForAge18())) {
                    return Promise.reject(
                      new Error('Bạn phải đủ 18 tuổi mới có thể đăng ký'),
                    )
                  }
                  return Promise.resolve()
                },
              },
            ]}
            extra={
              <span className="text-xs text-slate-500">
                Bạn phải đủ 18 tuổi mới có thể đăng ký
              </span>
            }
          >
            <DatePicker
              size="large"
              format="DD/MM/YYYY"
              className="w-full"
              placeholder="DD/MM/YYYY"
              disabledDate={(current) => {
                if (!current) return false
                const d = current.startOf('day')
                if (d.isAfter(dayjs().startOf('day'))) return true
                return d.isAfter(latestBirthDateForAge18())
              }}
            />
          </Form.Item>
        </Col>
        <Col span={24}>
          <Form.Item
            label="Ảnh đại diện"
            extra={
              <span className="text-xs text-slate-500">
                JPEG, PNG hoặc WebP — tối đa 2&nbsp;MB (tùy chọn)
              </span>
            }
          >
            <Upload
              listType="picture-card"
              maxCount={1}
              accept="image/jpeg,image/png,image/webp"
              fileList={fileList}
              disabled={uploading}
              beforeUpload={async (file) => {
                setUploading(true)
                try {
                  const { url } = await uploadAvatarFile(file)
                  form.setFieldValue('avatar', url)
                  message.success('Đã tải ảnh lên')
                } catch (e) {
                  message.error(
                    e instanceof Error ? e.message : 'Không tải được ảnh',
                  )
                } finally {
                  setUploading(false)
                }
                return false
              }}
              onRemove={() => {
                form.setFieldValue('avatar', '')
                return true
              }}
            >
              {fileList.length === 0 ? (
                <span className="text-slate-400 text-sm">Tải ảnh</span>
              ) : null}
            </Upload>
          </Form.Item>
          <Form.Item name="avatar" hidden>
            <Input type="hidden" />
          </Form.Item>
        </Col>
      </Row>
    </>
  )
}
