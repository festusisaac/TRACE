"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function LiveBook() {
  const pathname = usePathname();
  const router = useRouter();
  const stamp = useRef<string | null>(null);

  useEffect(() => {
    if (pathname === "/receive") return;
    let stopped = false;

    async function look() {
      try {
        const response = await fetch("/api/book-stamp");
        if (!response.ok || stopped) return;
        const body = (await response.json()) as { interactions: number; actions: number };
        const next = `${body.interactions}:${body.actions}`;
        if (stamp.current === null) {
          stamp.current = next;
          return;
        }
        if (stamp.current !== next) {
          stamp.current = next;
          router.refresh();
        }
      } catch {
        // The desk keeps the last figures if this check misses.
      }
    }

    const timer = setInterval(look, 4000);
    void look();
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [pathname, router]);

  return null;
}
