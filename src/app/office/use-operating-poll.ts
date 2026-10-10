"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  IgnoredOperatingPoll,
  OPERATING_STATE_POLL_INTERVAL_MS,
  reduceOperatingPoll,
  startOperatingPoll,
  type OperatingPollView,
  type OperatingStatus,
} from "@/app/office/operating-state-poll";

async function readOperatingStatus(response: Response): Promise<OperatingStatus> {
  const body = (await response.json()) as OperatingStatus;
  if (!response.ok) {
    throw new Error(body.error || "operating state unavailable");
  }
  return body;
}

export function useOperatingPoll(options?: { onStatus?: (status: OperatingStatus) => void }) {
  const [view, setView] = useState<OperatingPollView>({ status: null, error: null });
  const requestGen = useRef(0);
  const onStatus = options?.onStatus;

  const apply = useCallback(
    (next: OperatingPollView) => {
      setView(next);
      if (next.status) onStatus?.(next.status);
    },
    [onStatus],
  );

  useEffect(() => {
    const stop = startOperatingPoll({
      intervalMs: OPERATING_STATE_POLL_INTERVAL_MS,
      load: async () => {
        const mine = ++requestGen.current;
        const response = await fetch("/office/api/operating-state", { cache: "no-store" });
        const status = await readOperatingStatus(response);
        if (mine !== requestGen.current) throw new IgnoredOperatingPoll();
        return status;
      },
      onView: apply,
    });
    return stop;
  }, [apply]);

  return { view, setView: apply };
}

export { reduceOperatingPoll, readOperatingStatus };
