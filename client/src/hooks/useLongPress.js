import { useRef, useCallback } from "react";

export default function useLongPress(onLongPress, onClick, { delay = 450 } = {}) {
  const timerRef = useRef(null);
  const isLongPressRef = useRef(false);
  const touchStartPosRef = useRef({ x: 0, y: 0 });

  const start = useCallback(
    (e, item) => {
      isLongPressRef.current = false;
      if (e.touches && e.touches[0]) {
        touchStartPosRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        };
      }

      if (timerRef.current) clearTimeout(timerRef.current);

      timerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        if (onLongPress) {
          onLongPress(item, e);
        }
      }, delay);
    },
    [onLongPress, delay]
  );

  const move = useCallback((e) => {
    if (e.touches && e.touches[0]) {
      const dx = Math.abs(e.touches[0].clientX - touchStartPosRef.current.x);
      const dy = Math.abs(e.touches[0].clientY - touchStartPosRef.current.y);
      // Cancel long press if user is scrolling/swiping (> 10px movement)
      if (dx > 10 || dy > 10) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      }
    }
  }, []);

  const clear = useCallback(
    (e, item, shouldTriggerClick = true) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (!isLongPressRef.current && shouldTriggerClick && onClick) {
        onClick(item, e);
      }
      isLongPressRef.current = false;
    },
    [onClick]
  );

  return {
    handlers: (item) => ({
      onTouchStart: (e) => start(e, item),
      onTouchMove: move,
      onTouchEnd: (e) => clear(e, item, false), // Click will be handled by regular onClick if not long pressed
      onTouchCancel: (e) => clear(e, item, false),
      onContextMenu: (e) => {
        // Prevent default mobile context menu if long press triggered
        if (isLongPressRef.current) {
          e.preventDefault();
        }
      }
    }),
    isLongPress: () => isLongPressRef.current
  };
}
