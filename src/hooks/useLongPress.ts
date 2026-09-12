import { useRef } from 'react';

/**
 * Pointer handlers that distinguish a tap from a long press without
 * triggering both. Returns props to spread on the element.
 */
export function useLongPress(onTap: () => void, onLongPress: () => void, delayMs = 450) {
  const timer = useRef<number | null>(null);
  const fired = useRef(false);

  const clear = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      fired.current = false;
      clear();
      timer.current = window.setTimeout(() => {
        fired.current = true;
        onLongPress();
      }, delayMs);
    },
    onPointerUp: () => {
      const wasLong = fired.current;
      clear();
      if (!wasLong) onTap();
    },
    onPointerLeave: clear,
    onPointerCancel: clear,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
}
