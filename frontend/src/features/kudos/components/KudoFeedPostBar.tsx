import { CommentOutlined, LikeOutlined } from '@ant-design/icons'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { App, Button, Flex, Space, Typography } from 'antd'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { queryKeys } from '../../../shared/lib/query-keys'
import { useAuth } from '../../auth'
import { addKudoReaction, removeKudoReaction } from '../api/kudos-api'
import type { KudoFeedItem } from '../types'

const LIKE = '👍'
const PICKER_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const

/** Nhãn tiếng Việt theo emoji (khớp picker). */
const REACTION_LABELS: Record<(typeof PICKER_EMOJIS)[number], string> = {
  '👍': 'Thích',
  '❤️': 'Yêu thích',
  '😂': 'Haha',
  '😮': 'Ngạc nhiên',
  '😢': 'Buồn',
  '🙏': 'Cảm ơn',
}

function reactionButtonLabel(emoji: string | undefined): string {
  if (!emoji) return 'Thích'
  return REACTION_LABELS[emoji as keyof typeof REACTION_LABELS] ?? 'Cảm xúc'
}

function reactionSummary(
  reactions: KudoFeedItem['reactions'],
): [string, number][] {
  const map = new Map<string, number>()
  for (const r of reactions) {
    map.set(r.emoji, (map.get(r.emoji) ?? 0) + 1)
  }
  return [...map.entries()]
}

type Props = {
  kudoId: string
  reactions: KudoFeedItem['reactions']
  commentCount: number
  /** Trang chi tiết: cuộn tới bình luận thay vì mở lại URL */
  onCommentClick?: () => void
}

export function KudoFeedPostBar({
  kudoId,
  reactions,
  commentCount,
  onCommentClick,
}: Props) {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [pickerOpen, setPickerOpen] = useState(false)
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reactionRows = useMemo(() => reactionSummary(reactions), [reactions])

  const myReaction = useMemo(
    () => (user ? reactions.find((r) => r.user.id === user.id) : undefined),
    [reactions, user],
  )

  const invalidateFeed = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['kudos', 'feed'] })
    void queryClient.invalidateQueries({ queryKey: queryKeys.kudos.detail(kudoId) })
  }, [queryClient, kudoId])

  const setReactionMut = useMutation({
    mutationFn: (emoji: string) => addKudoReaction(kudoId, emoji),
    onSuccess: () => invalidateFeed(),
    onError: (e: Error) => message.error(e.message || 'Không cập nhật được cảm xúc.'),
  })

  const removeReactionMut = useMutation({
    mutationFn: () => removeKudoReaction(kudoId),
    onSuccess: () => invalidateFeed(),
    onError: (e: Error) => message.error(e.message || 'Không bỏ được cảm xúc.'),
  })

  const busy = setReactionMut.isPending || removeReactionMut.isPending

  if (user?.role === 'admin') {
    return (
      <Flex
        align="center"
        className="border-slate-700/80 mt-3 border-t pt-2"
        justify="space-between"
        gap={12}
        wrap="wrap"
      >
        {reactionRows.length > 0 ? (
          <Space size={6} wrap className="text-[15px] leading-none">
            {reactionRows.map(([emoji, count]) => (
              <span key={emoji} className="inline-flex items-baseline gap-1 whitespace-nowrap">
                <span>{emoji}</span>
                <Typography.Text type="secondary" className="text-xs">
                  {count}
                </Typography.Text>
              </span>
            ))}
          </Space>
        ) : <span />}
        <Button
          type="text"
          className="!text-slate-400 flex shrink-0 items-center gap-2 !px-2"
          onClick={() => {
            if (onCommentClick) onCommentClick()
            else void navigate(`/feed/${kudoId}`)
          }}
        >
          <CommentOutlined className="text-lg" />
          <span className="text-sm font-medium">Bình luận</span>
          {commentCount > 0 ? (
            <Typography.Text type="secondary" className="text-xs">
              {commentCount}
            </Typography.Text>
          ) : null}
        </Button>
      </Flex>
    )
  }

  const openPicker = () => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
    setPickerOpen(true)
  }

  const scheduleClosePicker = () => {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current)
    leaveTimerRef.current = setTimeout(() => setPickerOpen(false), 220)
  }

  const onMainLikeClick = () => {
    if (!user) return
    if (myReaction) {
      removeReactionMut.mutate()
    } else {
      setReactionMut.mutate(LIKE)
    }
  }

  const pickEmoji = (emoji: string) => {
    setReactionMut.mutate(emoji)
    setPickerOpen(false)
  }

  return (
    <Flex
      align="center"
      className="border-slate-700/80 mt-3 border-t pt-2"
      justify="space-between"
      gap={12}
      wrap="wrap"
    >
      <Flex align="center" gap={10} wrap className="min-w-0 flex-1">
        <div
          className="relative flex shrink-0 items-center"
          onMouseEnter={openPicker}
          onMouseLeave={scheduleClosePicker}
        >
          <Button
            type="text"
            loading={busy}
            className={`flex items-center gap-2 !px-2 ${myReaction ? '!text-violet-400' : '!text-slate-300'}`}
            onClick={(e) => {
              e.stopPropagation()
              onMainLikeClick()
            }}
          >
            {myReaction ? (
              <span className="text-lg leading-none">{myReaction.emoji}</span>
            ) : (
              <LikeOutlined className="text-lg" />
            )}
            <span className="text-sm font-medium">
              {reactionButtonLabel(myReaction?.emoji)}
            </span>
          </Button>

          {pickerOpen ? (
            <div
              className="absolute bottom-full left-0 z-20 mb-1 flex items-center gap-0.5 rounded-full border border-slate-600 bg-slate-800 px-2 py-1.5 shadow-xl"
              onMouseEnter={openPicker}
              onMouseLeave={scheduleClosePicker}
            >
              {PICKER_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-xl transition-transform hover:scale-125"
                  onClick={(ev) => {
                    ev.stopPropagation()
                    pickEmoji(e)
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {reactionRows.length > 0 ? (
          <Space size={6} wrap className="text-[15px] leading-none">
            {reactionRows.map(([emoji, count]) => (
              <span key={emoji} className="inline-flex items-baseline gap-1 whitespace-nowrap">
                <span>{emoji}</span>
                <Typography.Text type="secondary" className="text-xs">
                  {count}
                </Typography.Text>
              </span>
            ))}
          </Space>
        ) : null}
      </Flex>

      <Button
        type="text"
        className="!text-slate-300 flex shrink-0 items-center gap-2 !px-2"
        onClick={() => {
          if (onCommentClick) onCommentClick()
          else void navigate(`/feed/${kudoId}`)
        }}
      >
        <CommentOutlined className="text-lg" />
        <span className="text-sm font-medium">Bình luận</span>
        {commentCount > 0 ? (
          <Typography.Text type="secondary" className="text-xs">
            {commentCount}
          </Typography.Text>
        ) : null}
      </Button>
    </Flex>
  )
}
