'use client';

import { RefObject, useEffect, useRef, useState } from 'react';

const TRIGGER_PX = 64;
const MAX_PULL_PX = 96;

/** Pull-down-to-refresh for a scroll container. Only starts when the container is scrolled to the top. */
export function usePullToRefresh(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  onRefresh: () => Promise<void>,
) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    let startY: number | null = null;
    let current = 0;

    const onStart = (e: TouchEvent) => {
      startY = el.scrollTop <= 0 ? e.touches[0].clientY : null;
    };
    const onMove = (e: TouchEvent) => {
      if (startY === null) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0) { current = 0; setPull(0); return; }
      current = Math.min(dy * 0.5, MAX_PULL_PX);
      setPull(current);
    };
    const onEnd = async () => {
      const shouldRefresh = current >= TRIGGER_PX;
      startY = null;
      current = 0;
      setPull(0);
      if (!shouldRefresh) return;
      setRefreshing(true);
      try { await refreshRef.current(); } finally { setRefreshing(false); }
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, [ref, enabled]);

  return { pull, refreshing };
}
