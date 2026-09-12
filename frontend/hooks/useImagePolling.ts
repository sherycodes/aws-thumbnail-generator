"use client";

import { getImage } from "@/lib/api";
import type { ImageDto } from "@/lib/types";
import { useCallback, useEffect, useRef, useState } from "react";

const BACKOFF_MS = [
  800, 800, 1200, 1500, 2000, 2500, 3000, 3000, 4000, 4000, 5000, 5000, 6000,
  6000,
];

export type PollResult =
  | { phase: "idle" }
  | { phase: "waiting"; attempt: number }
  | { phase: "ready"; image: ImageDto }
  | { phase: "failed"; message: string }
  | { phase: "timeout" };

export function useImagePolling() {
  const [result, setResult] = useState<PollResult>({ phase: "idle" });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  const stop = useCallback(() => {
    cancelledRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const watch = useCallback(
    (imageId: string) => {
      stop();
      cancelledRef.current = false;
      let attempt = 0;
      const tick = async () => {
        if (cancelledRef.current) return;
        try {
          const image = await getImage(imageId);
          if (image.status === "READY") {
            setResult({ phase: "ready", image });
            return;
          }
          if (image.status === "FAILED") {
            setResult({
              phase: "failed",
              message: image.error ?? "Processing failed.",
            });
            return;
          }
        } catch {}
        const delay = BACKOFF_MS[attempt];
        if (delay === undefined) {
          setResult({ phase: "timeout" });
          return;
        }
        attempt += 1;
        setResult({ phase: "waiting", attempt });
        timerRef.current = setTimeout(tick, delay);
      };
      setResult({ phase: "waiting", attempt: 0 });
      timerRef.current = setTimeout(tick, BACKOFF_MS[0]);
    },
    [stop]
  );
  return { result, watch, stop };
}
