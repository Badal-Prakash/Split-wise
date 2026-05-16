"use client";

import { useEffect } from "react";
import { io } from "socket.io-client";

export function useRealtimeRefresh(events: string[], onRefresh: () => void) {
  useEffect(() => {
    let poll: ReturnType<typeof setInterval> | undefined;
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL ?? window.location.origin, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
    });

    for (const event of events) socket.on(event, onRefresh);
    socket.on("connect_error", () => {
      if (!poll) poll = setInterval(onRefresh, 15000);
    });
    socket.on("connect", () => {
      if (poll) clearInterval(poll);
      poll = undefined;
    });

    return () => {
      for (const event of events) socket.off(event, onRefresh);
      socket.disconnect();
      if (poll) clearInterval(poll);
    };
  }, [events, onRefresh]);
}
