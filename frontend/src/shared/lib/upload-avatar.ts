import { API_BASE } from './api'

export type UploadAvatarResponse = { url: string }

export async function uploadAvatarFile(
  file: File,
): Promise<UploadAvatarResponse> {
  const form = new FormData()
  form.append('file', file)
  const base = API_BASE.replace(/\/$/, '')
  const res = await fetch(`${base}/uploads/avatar`, {
    method: 'POST',
    body: form,
    credentials: 'include',
  })
  const data = (await res.json().catch(() => ({}))) as {
    url?: string
    error?: { message?: string }
    message?: string | string[]
  }
  if (!res.ok) {
    const msg =
      data?.error?.message ??
      (Array.isArray(data?.message)
        ? data.message.join(', ')
        : typeof data?.message === 'string'
          ? data.message
          : null) ??
      'Upload thất bại'
    throw new Error(msg)
  }
  if (!data.url) {
    throw new Error('Upload thất bại')
  }
  return { url: data.url }
}
