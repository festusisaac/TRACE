"use client";

import { useEffect, useState } from "react";
import { formatDuration, formatDurationSeconds } from "@/lib/engine/cbn.ts";

export function LiveDuration({
  deadlineAt,
  fallback,
  showSeconds = true,
}: {
  deadlineAt?: string;
  fallback: string;
  showSeconds?: boolean;
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (now === null || !deadlineAt) {
    return <span>{fallback}</span>;
  }

  const deadlineMs = Date.parse(deadlineAt);
  if (Number.isNaN(deadlineMs)) {
    return <span>{fallback}</span>;
  }

  const diffSec = Math.floor((deadlineMs - now) / 1000);

  if (showSeconds) {
    return <span>{formatDurationSeconds(diffSec)}</span>;
  }

  const diffMin = Math.floor(diffSec / 60);
  return <span>{formatDuration(diffMin)}</span>;
}
