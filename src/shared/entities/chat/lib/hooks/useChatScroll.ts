import { useEffect, useRef, useCallback } from 'react'
import type { ChatMessage } from '../../types'

interface UseChatScrollOptions {
  behavior?: ScrollBehavior
  autoScroll?: boolean
  scrollThreshold?: number
}

interface UseChatScrollReturn {
  scrollAreaRef: React.RefObject<HTMLDivElement>
  scrollToBottom: () => void
  isAtBottom: () => boolean
}

export const useChatScroll = (
  messages: ChatMessage[],
  options: UseChatScrollOptions = {}
): UseChatScrollReturn => {
  const {
    behavior = 'smooth',
    autoScroll = true,
    scrollThreshold = 100
  } = options

  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior
      })
    }
  }, [behavior])

  const isAtBottom = useCallback(() => {
    if (!scrollAreaRef.current) return true
    
    const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current
    return scrollHeight - scrollTop - clientHeight < scrollThreshold
  }, [scrollThreshold])

  // Auto-scroll when new messages are added
  useEffect(() => {
    if (autoScroll && messages.length > 0) {
      // Check if user was already at the bottom before auto-scrolling
      const wasAtBottom = isAtBottom()
      
      if (wasAtBottom) {
        // Small delay to ensure DOM has updated
        setTimeout(scrollToBottom, 10)
      }
    }
  }, [messages, autoScroll, scrollToBottom, isAtBottom])

  return {
    scrollAreaRef,
    scrollToBottom,
    isAtBottom
  }
}