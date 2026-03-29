import { BellOutlined } from '@ant-design/icons'
import { App, Badge, Button, Dropdown, Empty, List, Spin, Typography } from 'antd'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../features/auth/store/authStore'
import { fetchReceivedShoutouts } from '../../features/kudos/api/kudos-api'
import type { KudoShoutoutPayload } from '../../features/kudos/types'
import { createNotificationsSocket } from '../lib/notifications-socket'

const INITIAL_LIMIT = 3
const PAGE_MORE = 10

type Item = KudoShoutoutPayload & { key: string; read: boolean }

function senderLabel(s: KudoShoutoutPayload['sender']): string {
  const n = s.fullName?.trim()
  if (n) return n
  return s.email
}

function mergeInitialFromServer(prev: Item[], server: KudoShoutoutPayload[]): Item[] {
  const serverItems: Item[] = server.map((p) => ({
    ...p,
    key: p.kudoId,
    read: true,
  }))
  const sIds = new Set(serverItems.map((i) => i.kudoId))
  const orphan = prev.filter((p) => !sIds.has(p.kudoId))
  return [...orphan, ...serverItems].sort(
    (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
  )
}

export function NotificationBell() {
  const { notification: notificationApi } = App.useApp()
  const notificationRef = useRef(notificationApi)
  notificationRef.current = notificationApi

  const accessToken = useAuthStore((s) => s.accessToken)
  const [items, setItems] = useState<Item[]>([])
  const [open, setOpen] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingInitial, setLoadingInitial] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingMoreRef = useRef(false)
  const nextCursorRef = useRef<string | null>(null)
  const loadingInitialRef = useRef(false)

  nextCursorRef.current = nextCursor
  loadingInitialRef.current = loadingInitial

  const unread = useMemo(() => items.filter((i) => !i.read).length, [items])

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((i) => ({ ...i, read: true })))
  }, [])

  const loadMore = useCallback(async () => {
    const cursor = nextCursorRef.current
    if (!cursor || loadingMoreRef.current || loadingInitialRef.current) return
    loadingMoreRef.current = true
    setLoadingMore(true)
    try {
      const res = await fetchReceivedShoutouts({ limit: PAGE_MORE, cursor })
      setItems((prev) => {
        const ids = new Set(prev.map((p) => p.kudoId))
        const extra: Item[] = res.items
          .filter((p) => !ids.has(p.kudoId))
          .map((p) => ({ ...p, key: p.kudoId, read: true }))
        return [...prev, ...extra]
      })
      setNextCursor(res.nextCursor)
    } finally {
      loadingMoreRef.current = false
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => {
    if (!accessToken) {
      setItems([])
      setNextCursor(null)
      return
    }
    let cancelled = false
    setLoadingInitial(true)
    void fetchReceivedShoutouts({ limit: INITIAL_LIMIT })
      .then((res) => {
        if (cancelled) return
        setItems((prev) => mergeInitialFromServer(prev, res.items))
        setNextCursor(res.nextCursor)
      })
      .finally(() => {
        if (!cancelled) setLoadingInitial(false)
      })
    return () => {
      cancelled = true
    }
  }, [accessToken])

  useEffect(() => {
    if (!accessToken) {
      return
    }
    const socket = createNotificationsSocket(accessToken)
    const onShoutout = (payload: KudoShoutoutPayload) => {
      if (payload?.type !== 'kudo_received') return
      setItems((prev) => {
        const filtered = prev.filter((p) => p.kudoId !== payload.kudoId)
        return [{ ...payload, key: payload.kudoId, read: false }, ...filtered].sort(
          (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
        )
      })

      notificationRef.current.open({
        key: `kudo-${payload.kudoId}`,
        message: 'Shout-out mới',
        description: `${senderLabel(payload.sender)} · +${payload.points} điểm · ${payload.coreValue.name}`,
        placement: 'topRight',
        duration: 6,
      })
    }
    socket.on('kudo:shoutout', onShoutout)
    return () => {
      socket.off('kudo:shoutout', onShoutout)
      socket.disconnect()
    }
  }, [accessToken])

  /** Popup Ant Design dùng portal; onScroll không tin cậy — IO + sentinel, root = khối overflow. */
  useLayoutEffect(() => {
    if (!open || loadingInitial || !nextCursor) return

    let cancelled = false
    const observerRef: { current: IntersectionObserver | null } = { current: null }

    let attempts = 0
    const trySetup = () => {
      if (cancelled) return
      const root = scrollRef.current
      const sentinel = sentinelRef.current
      if (!root || !sentinel) {
        if (attempts++ < 40) requestAnimationFrame(trySetup)
        return
      }
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const hit = entries.some((e) => e.isIntersecting)
          if (!hit) return
          if (!nextCursorRef.current || loadingMoreRef.current || loadingInitialRef.current) return
          void loadMore()
        },
        { root, rootMargin: '0px 0px 120px 0px', threshold: 0 },
      )
      observerRef.current.observe(sentinel)
    }

    requestAnimationFrame(trySetup)
    return () => {
      cancelled = true
      observerRef.current?.disconnect()
      observerRef.current = null
    }
  }, [open, loadingInitial, nextCursor, loadMore])

  const dropdown = (
    <div className="w-[min(100vw-24px,360px)] rounded-lg border border-slate-700 bg-slate-900 p-2 shadow-xl">
      <Typography.Text strong className="mb-2 block text-slate-200">
        Shout-out tới bạn
      </Typography.Text>
      <div ref={scrollRef} className="max-h-72 overflow-y-auto overscroll-contain">
        {loadingInitial && items.length === 0 ? (
          <div className="flex justify-center py-10">
            <Spin />
          </div>
        ) : items.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có thông báo" />
        ) : (
          <>
            <List
              size="small"
              dataSource={items}
              renderItem={(it) => (
                <List.Item className="!px-2 !py-2">
                  <div className="w-full text-sm">
                    <span className="font-medium text-violet-300">{senderLabel(it.sender)}</span>
                    <span className="text-slate-400"> đã gửi </span>
                    <span className="text-slate-200">{it.points} điểm</span>
                    <span className="text-slate-400"> · </span>
                    <span className="text-slate-300">{it.coreValue.name}</span>
                    {it.descriptionPreview ? (
                      <Typography.Paragraph
                        type="secondary"
                        className="!mb-0 !mt-1 text-xs"
                        ellipsis={{ rows: 2 }}
                      >
                        {it.descriptionPreview}
                      </Typography.Paragraph>
                    ) : null}
                    <Link
                      to="/feed"
                      className="mt-1 inline-block text-xs text-violet-400 hover:text-violet-300"
                      onClick={() => setOpen(false)}
                    >
                      Xem feed
                    </Link>
                  </div>
                </List.Item>
              )}
            />
            {loadingMore ? (
              <div className="flex justify-center py-2">
                <Spin size="small" />
              </div>
            ) : null}
            {nextCursor ? <div ref={sentinelRef} className="h-px w-full shrink-0" aria-hidden /> : null}
          </>
        )}
      </div>
    </div>
  )

  return (
    <Dropdown
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (v) markAllRead()
      }}
      dropdownRender={() => dropdown}
      trigger={['click']}
      placement="bottomRight"
    >
      <Badge count={unread} size="small" offset={[-4, 4]}>
        <Button
          type="text"
          aria-label="Thông báo shout-out"
          icon={<BellOutlined className="text-lg text-slate-200" />}
        />
      </Badge>
    </Dropdown>
  )
}
