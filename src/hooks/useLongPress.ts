import { useRef, useCallback } from 'react'

interface LongPressOptions {
  onTap: () => void
  onLongPressActivate: () => void
  onLongPressRelease: () => void
  disabled?: boolean
}

const TAP_MAX_MS = 300
const LONG_PRESS_MS = 500

export function useLongPress({
  onTap,
  onLongPressActivate,
  onLongPressRelease,
  disabled = false,
}: LongPressOptions) {
  const activePointerId = useRef<number | null>(null)
  const pressStartTime = useRef<number>(0)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressActivated = useRef(false)

  const cleanup = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    activePointerId.current = null
    longPressActivated.current = false
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return
      if (activePointerId.current !== null) return // ignore multi-touch

      e.preventDefault()
      activePointerId.current = e.pointerId
      pressStartTime.current = e.timeStamp
      longPressActivated.current = false

      longPressTimer.current = setTimeout(() => {
        longPressActivated.current = true
        onLongPressActivate()
      }, LONG_PRESS_MS)
    },
    [disabled, onLongPressActivate],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerId !== activePointerId.current) return

      const elapsed = e.timeStamp - pressStartTime.current

      if (longPressActivated.current) {
        cleanup()
        onLongPressRelease()
      } else if (elapsed < TAP_MAX_MS) {
        cleanup()
        onTap()
      } else {
        // Dead zone (300–500 ms): silent cancel
        cleanup()
      }
    },
    [cleanup, onTap, onLongPressRelease],
  )

  const onPointerLeave = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerId !== activePointerId.current) return
      if (longPressActivated.current) {
        cleanup()
        onLongPressRelease()
      } else {
        cleanup()
      }
    },
    [cleanup, onLongPressRelease],
  )

  const onPointerCancel = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerId !== activePointerId.current) return
      if (longPressActivated.current) {
        cleanup()
        onLongPressRelease()
      } else {
        cleanup()
      }
    },
    [cleanup, onLongPressRelease],
  )

  return {
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    onPointerCancel,
  }
}
