"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The countdown of a timed (System One) question.
 *
 * Nothing runs until `begin` is called, which is when the question is revealed.
 * `stop` ends it early, when the question has been answered. If the time runs
 * out first, `onExpire` is called once. While `active` is false the clock is
 * stopped and cannot expire.
 */
export function useCountdown(seconds: number | undefined, onExpire: () => void, active = true) {
  const [deadline, setDeadline] = useState<number | null>(null);
  const [left, setLeft] = useState(seconds ?? 0);
  const startedAt = useRef(0);
  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  });

  useEffect(() => {
    if (deadline === null || !active) return;
    const tick = () => {
      const remaining = Math.ceil((deadline - Date.now()) / 1000);
      setLeft(Math.max(0, remaining));
      if (remaining <= 0) {
        setDeadline(null);
        expire.current();
      }
    };
    const timer = setInterval(tick, 200);
    return () => clearInterval(timer);
  }, [deadline, active]);

  /** Starts the clock with the question's full time, or with `remainingMs` when the server says part of it is already used. */
  const begin = useCallback(
    (remainingMs?: number) => {
      if (seconds === undefined) return;
      const ms = Math.max(0, Math.min(seconds * 1000, remainingMs ?? seconds * 1000));
      startedAt.current = Date.now() - (seconds * 1000 - ms);
      setLeft(Math.ceil(ms / 1000));
      setDeadline(Date.now() + ms);
    },
    [seconds],
  );
  const stop = useCallback(() => setDeadline(null), []);
  /** Milliseconds since the question was revealed. */
  const elapsed = useCallback(() => Date.now() - startedAt.current, []);

  return { running: deadline !== null && active, left, begin, stop, elapsed };
}
