"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { EventItem, fetchMissionEvents } from "./events";

export type ConnectionStatus = "connecting" | "connected" | "reconnecting" | "disconnected";

interface UseWebSocketOptions {
  channel?: "system" | string; // e.g. "system" or mission_id
  onEvent?: (event: EventItem) => void;
  autoReconnect?: boolean;
  enableReplaySync?: boolean;
}

export function useWebSocket({
  channel = "system",
  onEvent,
  autoReconnect = true,
  enableReplaySync = true,
}: UseWebSocketOptions = {}) {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [lastEvent, setLastEvent] = useState<EventItem | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [lastSequence, setLastSequence] = useState<number>(0);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const isMissionChannel = channel !== "system";
  const missionId = isMissionChannel ? channel : null;

  const getWsUrl = useCallback(() => {
    const wsBase = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";
    if (isMissionChannel && missionId) {
      return `${wsBase}/ws/missions/${missionId}`;
    }
    return `${wsBase}/ws/events`;
  }, [isMissionChannel, missionId]);

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;

    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const url = getWsUrl();
      setStatus((prev) => (prev === "connected" ? "reconnecting" : "connecting"));
      const ws = new WebSocket(url);
      socketRef.current = ws;

      ws.onopen = async () => {
        if (!isMountedRef.current) return;
        setStatus("connected");
        reconnectAttemptsRef.current = 0;

        // Setup ping keepalive
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 20000);

        // Replay reconciliation for missed events if reconnected and mission scoped
        if (enableReplaySync && isMissionChannel && missionId && lastSequence > 0) {
          try {
            const missedEvents = await fetchMissionEvents(missionId, lastSequence);
            if (missedEvents.length > 0) {
              setEvents((prev) => {
                const existingIds = new Set(prev.map((e) => e.id));
                const newItems = missedEvents.filter((e) => !existingIds.has(e.id));
                return [...prev, ...newItems];
              });
              const highest = Math.max(...missedEvents.map((e) => e.sequence_number));
              setLastSequence(highest);
              missedEvents.forEach((e) => onEventRef.current?.(e));
            }
          } catch (replayErr) {
            console.warn("Replay sync error:", replayErr);
          }
        }
      };

      ws.onmessage = (messageEvent) => {
        if (!isMountedRef.current) return;
        try {
          const data = JSON.parse(messageEvent.data);
          if (data.type === "pong") return;

          const eventItem = data as EventItem;
          if (eventItem.id && eventItem.event_type) {
            setLastEvent(eventItem);
            setEvents((prev) => [eventItem, ...prev]);
            if (eventItem.sequence_number) {
              setLastSequence((prev) => Math.max(prev, eventItem.sequence_number));
            }
            onEventRef.current?.(eventItem);
          }
        } catch (parseErr) {
          console.debug("WS non-event message:", messageEvent.data);
        }
      };

      ws.onclose = () => {
        if (!isMountedRef.current) return;
        setStatus("disconnected");
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        if (autoReconnect) {
          const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 10000);
          reconnectAttemptsRef.current += 1;
          setStatus("reconnecting");
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };

      ws.onerror = (err) => {
        console.debug("WebSocket error:", err);
      };
    } catch (e) {
      console.warn("WebSocket connection failure:", e);
      setStatus("disconnected");
    }
  }, [getWsUrl, enableReplaySync, isMissionChannel, missionId, lastSequence, autoReconnect]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [connect]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    status,
    lastEvent,
    events,
    lastSequence,
    clearEvents,
    reconnect: connect,
  };
}
