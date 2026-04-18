import { useCallback, useEffect, useRef } from 'react';

/**
 * Keeps the message list pinned to the bottom when new messages arrive.
 */
export function useChatScroll(deps: unknown[]) {
  const endRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    endRef.current?.scrollIntoView({ behavior, block: 'end' });
  }, []);

  useEffect(() => {
    scrollToBottom('smooth');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scroll when conversation payload changes
  }, deps);

  return { endRef, scrollToBottom };
}
