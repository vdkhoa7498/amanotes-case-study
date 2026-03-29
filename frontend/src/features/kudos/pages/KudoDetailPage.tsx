import { ArrowLeftOutlined, SendOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Avatar, Button, Card, Flex, Spin, Tag, Typography } from 'antd'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import relativeTime from 'dayjs/plugin/relativeTime'
import Quill from 'quill'
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { queryKeys } from '../../../shared/lib/query-keys'
import { sanitizeCommentBodyHtml } from '../../../shared/lib/sanitize-comment-body'
import { userDisplayLabel } from '../../../shared/lib/user-display'
import { useAuth } from '../../auth'
import {
  addKudoComment,
  fetchKudoDetail,
  uploadCommentMedia,
} from '../api/kudos-api'
import { KudoFeedPostBar } from '../components/KudoFeedPostBar'
import { registerCommentQuillVideoFileBlot } from '../lib/register-comment-quill-video-file'
import type { PublicUser } from '../types'

dayjs.extend(relativeTime)
dayjs.locale('vi')

import 'quill/dist/quill.core.css'

registerCommentQuillVideoFileBlot()

const COMMENT_MEDIA_ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
])

function userInitial(u: PublicUser): string {
  const n = u.fullName?.trim()
  if (n) return n.slice(0, 1).toUpperCase()
  return u.email.slice(0, 1).toUpperCase()
}

function mediaStatusColor(status: string): string {
  if (status === 'ready') return 'success'
  if (status === 'failed') return 'error'
  if (status === 'processing') return 'processing'
  return 'default'
}

function mediaStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Chờ xử lý',
    processing: 'Đang xử lý',
    ready: 'Sẵn sàng',
    failed: 'Lỗi',
  }
  return map[status] ?? status
}

function isCommentBodyEmpty(html: string): boolean {
  if (/<img\s/i.test(html) || /<video[\s>]/i.test(html)) return false
  const t = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .trim()
  return t === ''
}

export function KudoDetailPage() {
  const { kudoId } = useParams<{ kudoId: string }>()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const editorHostRef = useRef<HTMLDivElement>(null)
  const quillRef = useRef<Quill | null>(null)
  const messageRef = useRef(message)
  messageRef.current = message
  const [uploadingMedia, setUploadingMedia] = useState(false)

  const q = useQuery({
    queryKey: queryKeys.kudos.detail(kudoId ?? ''),
    queryFn: () => fetchKudoDetail(kudoId!),
    enabled: !!kudoId,
  })

  const commentMut = useMutation({
    mutationFn: (payload: { body: string }) =>
      addKudoComment(kudoId!, { body: payload.body }),
    onSuccess: () => {
      quillRef.current?.setText('')
      void queryClient.invalidateQueries({
        queryKey: queryKeys.kudos.detail(kudoId!),
      })
      void queryClient.invalidateQueries({ queryKey: ['kudos', 'feed'] })
      messageRef.current.success('Đã đăng bình luận.')
    },
    onError: (e: Error) => {
      messageRef.current.error(e.message || 'Không gửi được bình luận.')
    },
  })

  const submitComment = () => {
    const html = quillRef.current?.root.innerHTML ?? ''
    const body = sanitizeCommentBodyHtml(html)
    if (isCommentBodyEmpty(body)) {
      messageRef.current.warning('Nhập nội dung hoặc đính kèm ảnh/video.')
      return
    }
    commentMut.mutate({ body: body || '<p></p>' })
  }

  const processFiles = useCallback(async (quill: Quill, files: File[]) => {
    const accepted = files.filter((f) => COMMENT_MEDIA_ALLOWED.has(f.type))
    if (accepted.length === 0 && files.length > 0) {
      messageRef.current.warning(
        'Chỉ hỗ trợ ảnh JPEG, PNG, WebP hoặc video MP4/WebM.',
      )
      return
    }
    if (accepted.length === 0) return

    setUploadingMedia(true)
    try {
      const range = quill.getSelection(true)
      let idx = range?.index ?? Math.max(0, quill.getLength() - 1)
      for (const file of accepted) {
        const { url } = await uploadCommentMedia(file)
        if (file.type.startsWith('image/')) {
          quill.insertEmbed(idx, 'image', url, Quill.sources.USER)
        } else {
          quill.insertEmbed(idx, 'videoFile', url, Quill.sources.USER)
        }
        idx += 1
      }
      quill.setSelection(idx, 0, Quill.sources.SILENT)
    } catch (err) {
      messageRef.current.error(
        err instanceof Error ? err.message : 'Upload thất bại',
      )
    } finally {
      setUploadingMedia(false)
    }
  }, [])

  useLayoutEffect(() => {
    if (!user || !q.data || !editorHostRef.current) return
    const host = editorHostRef.current
    host.innerHTML = ''

    const quill = new Quill(host, {
      theme: 'default',
      placeholder:
        'Viết bình luận… Kéo thả hoặc dán ảnh (JPEG, PNG, WebP) / video (MP4, WebM)',
      modules: {
        toolbar: false,
      },
    })
    quillRef.current = quill

    const root = quill.root

    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? [])
      if (files.length === 0) return
      e.preventDefault()
      void processFiles(quill, files)
    }

    const onDragOver = (e: DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }

    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      const files = Array.from(e.dataTransfer?.files ?? [])
      if (files.length === 0) return
      void processFiles(quill, files)
    }

    const onCompositionStart = () => {
      root.classList.add('ql-composing')
    }
    const onCompositionEnd = () => {
      root.classList.remove('ql-composing')
    }

    root.addEventListener('paste', onPaste)
    root.addEventListener('dragover', onDragOver)
    root.addEventListener('drop', onDrop)
    root.addEventListener('compositionstart', onCompositionStart)
    root.addEventListener('compositionend', onCompositionEnd)

    return () => {
      root.removeEventListener('paste', onPaste)
      root.removeEventListener('dragover', onDragOver)
      root.removeEventListener('drop', onDrop)
      root.removeEventListener('compositionstart', onCompositionStart)
      root.removeEventListener('compositionend', onCompositionEnd)
      quillRef.current = null
      host.innerHTML = ''
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, q.data?.id, kudoId, processFiles])

  const data = q.data

  return (
    <div className="pb-[340px]">
      <Flex vertical gap={16}>
        <Link
          to="/feed"
          className="inline-flex w-fit items-center gap-2 text-slate-300 hover:text-violet-400"
        >
          <ArrowLeftOutlined />
          Về bảng tin
        </Link>

        {q.isPending ? (
          <Flex justify="center" style={{ padding: 48 }}>
            <Spin />
          </Flex>
        ) : null}

        {q.isError ? (
          <Typography.Text type="danger">
            {q.error instanceof Error
              ? q.error.message
              : 'Không tải được bài viết.'}
          </Typography.Text>
        ) : null}

        {data ? (
          <>
            <Card>
              <Flex vertical gap={12}>
                <Flex gap={12} align="flex-start">
                  <Avatar src={data.sender.avatar || undefined} size={48}>
                    {userInitial(data.sender)}
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <Typography.Title level={4} style={{ margin: 0 }}>
                      {userDisplayLabel(data.sender)}
                    </Typography.Title>
                    <Typography.Text type="secondary" className="text-sm">
                      {dayjs(data.createdAt).format('DD/MM/YYYY HH:mm')} ·{' '}
                      {dayjs(data.createdAt).fromNow()}
                    </Typography.Text>
                    <Flex wrap gap={8} align="center" className="mt-1">
                      <Tag color="purple">{data.coreValue.name}</Tag>
                      <Typography.Text type="secondary" className="text-xs">
                        {data.coreValue.slug}
                      </Typography.Text>
                      {data.status !== 'ready' ? (
                        <Tag bordered={false}>{data.status}</Tag>
                      ) : null}
                    </Flex>
                  </div>
                </Flex>

                <Typography.Paragraph className="!mb-0 text-base whitespace-pre-wrap">
                  {data.description}
                </Typography.Paragraph>

                <div>
                  <Typography.Text
                    type="secondary"
                    className="mb-2 block text-sm"
                  >
                    Ghi nhận cho
                  </Typography.Text>
                  <Flex wrap gap={8}>
                    {data.recipients.map((r) => (
                      <Tag
                        key={r.userId}
                        bordered={false}
                        style={{ marginInlineEnd: 0 }}
                      >
                        {`${userDisplayLabel(r.user)} · +${r.points} điểm`}
                      </Tag>
                    ))}
                  </Flex>
                </div>

                {data.media.length > 0 ? (
                  <div>
                    <Typography.Text
                      type="secondary"
                      className="mb-2 block text-sm"
                    >
                      Đính kèm
                    </Typography.Text>
                    <Flex vertical gap={10}>
                      {data.media.map((m) =>
                        m.url && m.processingStatus === 'ready' ? (
                          m.mediaType === 'video' ? (
                            <video
                              key={m.id}
                              src={m.url}
                              controls
                              className="max-h-80 max-w-full rounded-lg border border-slate-700"
                            />
                          ) : (
                            <img
                              key={m.id}
                              src={m.url}
                              alt=""
                              className="max-h-80 max-w-full rounded-lg border border-slate-700 object-contain"
                            />
                          )
                        ) : (
                          <Tag
                            key={m.id}
                            color={mediaStatusColor(m.processingStatus)}
                          >
                            {mediaStatusLabel(m.processingStatus)} ·{' '}
                            {m.mediaType}
                            {m.durationSeconds != null
                              ? ` · ${m.durationSeconds}s`
                              : ''}
                          </Tag>
                        ),
                      )}
                    </Flex>
                  </div>
                ) : null}

                <KudoFeedPostBar
                  kudoId={data.id}
                  reactions={data.reactions}
                  commentCount={data.comments.length}
                  onCommentClick={() =>
                    document.getElementById('kudo-comments')?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    })
                  }
                />
              </Flex>
            </Card>

            <Typography.Title
              level={5}
              style={{ margin: 0 }}
              id="kudo-comments"
            >
              Bình luận · {data.comments.length}
            </Typography.Title>

            <Flex vertical gap={16}>
              {data.comments.map((c) => (
                <Card key={c.id} size="small">
                  <Flex gap={12} align="flex-start">
                    <Avatar src={c.author.avatar || undefined} size={40}>
                      {userInitial(c.author)}
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <Flex gap={8} align="baseline" wrap className="mb-1">
                        <Typography.Text strong>
                          {userDisplayLabel(c.author)}
                        </Typography.Text>
                        <Typography.Text type="secondary" className="text-xs">
                          {new Date(c.createdAt).toLocaleString('vi-VN')}
                        </Typography.Text>
                      </Flex>
                      <div
                        className="prose prose-invert max-w-none text-sm text-slate-200 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_a]:text-violet-400 [&_img+img]:mt-2 [&_img]:my-1 [&_img]:max-h-72 [&_img]:rounded-lg [&_img]:border [&_img]:border-slate-700 [&_video]:my-1 [&_video]:max-h-72 [&_video]:max-w-full [&_video]:rounded-lg [&_video]:border [&_video]:border-slate-700"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeCommentBodyHtml(c.body),
                        }}
                      />
                      {c.media.length > 0 ? (
                        <Flex vertical gap={8} className="mt-2">
                          {c.media.map((m) =>
                            m.mediaType === 'video' && m.url ? (
                              <video
                                key={m.id}
                                src={m.url}
                                controls
                                className="max-h-72 max-w-full rounded-lg border border-slate-700"
                              />
                            ) : m.url ? (
                              <img
                                key={m.id}
                                src={m.url}
                                alt=""
                                className="max-h-72 max-w-full rounded-lg border border-slate-700 object-contain"
                              />
                            ) : null,
                          )}
                        </Flex>
                      ) : null}
                    </div>
                  </Flex>
                </Card>
              ))}
            </Flex>
          </>
        ) : null}
      </Flex>

      {user && data ? (
        <div className="fixed right-0 bottom-0 left-0 z-20 border-t border-slate-700/80 bg-slate-950/95 px-4 py-4 backdrop-blur-md">
          <div className="relative mx-auto w-full max-w-3xl">
            <div
              className={[
                'group relative overflow-hidden rounded-xl border border-slate-700/90 bg-slate-900/80 shadow-lg shadow-black/25',
                'ring-1 ring-white/5 transition-shadow focus-within:border-violet-500/50 focus-within:ring-2 focus-within:ring-violet-500/25',
                '[&_.ql-container]:border-0 [&_.ql-container]:font-sans',
                '[&_.ql-editor]:min-h-[120px] [&_.ql-editor]:text-[15px] [&_.ql-editor]:leading-relaxed [&_.ql-editor]:text-slate-100',
                '[&_.ql-editor]:!px-4 [&_.ql-editor]:!pt-4 [&_.ql-editor]:!pb-14 [&_.ql-editor]:!pr-[3.25rem]',
                '[&_.ql-editor.ql-blank::before]:!left-4 [&_.ql-editor.ql-blank::before]:!right-[3.25rem] [&_.ql-editor.ql-blank::before]:!top-4',
                '[&_.ql-editor.ql-blank::before]:!text-[#94a3b8] [&_.ql-editor.ql-blank::before]:!not-italic',
                '[&_.ql-editor.ql-blank::before]:!whitespace-normal [&_.ql-editor.ql-blank::before]:!text-left',
                '[&_.ql-editor.ql-composing.ql-blank::before]:!opacity-0',
                '[&_.ql-editor_p]:mb-2 [&_.ql-editor_p:last-child]:!mb-0',
                '[&_.ql-editor_img+img]:mt-2',
                '[&_.ql-editor_.ql-video]:my-2 [&_.ql-editor_.ql-video]:max-h-72 [&_.ql-editor_.ql-video]:max-w-full [&_.ql-editor_.ql-video]:rounded-lg [&_.ql-editor_.ql-video]:border [&_.ql-editor_.ql-video]:border-slate-600',
                '[&_.ql-editor_img]:my-2 [&_.ql-editor_img]:max-h-72 [&_.ql-editor_img]:rounded-lg [&_.ql-editor_img]:border [&_.ql-editor_img]:border-slate-600 [&_.ql-editor_img]:align-middle',
              ].join(' ')}
            >
              <div ref={editorHostRef} />
              <Button
                type="primary"
                shape="circle"
                size="large"
                icon={<SendOutlined />}
                loading={commentMut.isPending || uploadingMedia}
                onClick={submitComment}
                className="!absolute !bottom-3 !right-3 z-10 !flex !h-10 !w-10 !items-center !justify-center !p-0 shadow-md"
                aria-label="Đăng bình luận"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
