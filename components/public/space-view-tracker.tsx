"use client";

import { useEffect } from "react";

export function SpaceViewTracker({ spaceSlug }: { spaceSlug: string }) {
  useEffect(() => {
    fetch("/api/viewer-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spaceId: spaceSlug, event: "view_start" })
    }).catch(() => {
      // non-blocking analytics
    });

    return () => {
      void fetch("/api/viewer-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({ spaceId: spaceSlug, event: "view_end" })
      }).catch(() => {
        // non-blocking analytics
      });
    };
  }, [spaceSlug]);

  return null;
}
