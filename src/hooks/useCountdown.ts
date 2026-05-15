"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * 倒计时 hook
 * @param seconds 初始秒数
 * @param onEnd 倒计时结束回调
 * @returns { count, start, stop, reset }
 */
export function useCountdown(seconds: number, onEnd?: () => void) {
  const [count, setCount] = useState(seconds);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const start = useCallback(() => {
    stop();
    setIsRunning(true);
    timerRef.current = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          stop();
          onEndRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stop]);

  const reset = useCallback((newSeconds?: number) => {
    stop();
    setCount(newSeconds ?? seconds);
  }, [seconds, stop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { count, isRunning, start, stop, reset };
}
