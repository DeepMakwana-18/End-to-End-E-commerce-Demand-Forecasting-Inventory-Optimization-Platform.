/**
 * useWebSocket — React hook for tenant-aware WebSocket connection.
 *
 * Auto-connects when authenticated, reconnects on disconnection,
 * and dispatches events to registered listeners.
 *
 * Usage:
 *   const { isConnected, lastMessage } = useWebSocket();
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from '@/stores/appStore';

export interface WSMessage {
  type: string;
  data: Record<string, unknown>;
}

type MessageHandler = (msg: WSMessage) => void;

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000]; // Exponential backoff

export function useWebSocket() {
  const { accessToken, isAuthenticated } = useAppStore();
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, Set<MessageHandler>>>(new Map());
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);

  const getWsUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws?token=${accessToken}`;
  }, [accessToken]);

  const connect = useCallback(() => {
    if (!isAuthenticated || !accessToken) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(getWsUrl());

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttemptRef.current = 0;
        console.log('[WS] Connected');
      };

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);
          if (msg.type === 'ping') {
            ws.send('pong');
            return;
          }
          setLastMessage(msg);
          // Dispatch to type-specific handlers
          const handlers = handlersRef.current.get(msg.type);
          if (handlers) {
            handlers.forEach((handler) => handler(msg));
          }
          // Dispatch to wildcard handlers
          const wildcardHandlers = handlersRef.current.get('*');
          if (wildcardHandlers) {
            wildcardHandlers.forEach((handler) => handler(msg));
          }
        } catch {
          // Non-JSON message (pong, etc.)
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        wsRef.current = null;
        console.log(`[WS] Disconnected (code=${event.code})`);

        // Don't reconnect on auth failure
        if (event.code === 4001) return;

        // Exponential backoff reconnect
        const attempt = reconnectAttemptRef.current;
        const delay = RECONNECT_DELAYS[Math.min(attempt, RECONNECT_DELAYS.length - 1)];
        reconnectAttemptRef.current = attempt + 1;
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[WS] Connection error:', err);
    }
  }, [isAuthenticated, accessToken, getWsUrl]);

  // Connect on mount / auth change
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      connect();
    }
    return () => {
      clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
        wsRef.current = null;
      }
    };
  }, [isAuthenticated, accessToken, connect]);

  // Subscribe to specific event types
  const subscribe = useCallback((eventType: string, handler: MessageHandler) => {
    if (!handlersRef.current.has(eventType)) {
      handlersRef.current.set(eventType, new Set());
    }
    handlersRef.current.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      handlersRef.current.get(eventType)?.delete(handler);
    };
  }, []);

  return {
    isConnected,
    lastMessage,
    subscribe,
  };
}
