/**
 * WSContext — Global singleton WebSocket context.
 *
 * A single authenticated WebSocket connection shared across the entire app.
 * All components subscribe to events through this context via useWebSocket().
 *
 * Architecture:
 *   WSProvider (App root)
 *     → single WebSocket to /ws?token=<jwt>
 *     → reconnect with exponential backoff
 *     → dispatches to type-specific subscriber sets
 *     → any component calls useWebSocket() to subscribe
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAppStore } from '@/stores/appStore';

// ── Types ───────────────────────────────────────────────────────────

export interface WSMessage {
  type: string;
  data: Record<string, unknown>;
}

type MessageHandler = (msg: WSMessage) => void;

interface WSContextValue {
  isConnected: boolean;
  lastMessage: WSMessage | null;
  subscribe: (eventType: string, handler: MessageHandler) => () => void;
}

// ── Context ──────────────────────────────────────────────────────────

const WSContext = createContext<WSContextValue>({
  isConnected: false,
  lastMessage: null,
  subscribe: () => () => {},
});

// ── Reconnect schedule ───────────────────────────────────────────────

const RECONNECT_DELAYS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000];

// ── Provider ─────────────────────────────────────────────────────────

export function WSProvider({ children }: { children: ReactNode }) {
  const { accessToken, isAuthenticated } = useAppStore();

  const wsRef = useRef<WebSocket | null>(null);
  /** type → Set<handler> */
  const handlersRef = useRef<Map<string, Set<MessageHandler>>>(new Map());
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  /** Prevents stale closures from reconnecting after logout */
  const mountedRef = useRef(true);

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);

  // ── Build WS URL ──────────────────────────────────────────────────
  const getWsUrl = useCallback((): string => {
    // Explicit env override (set VITE_WS_URL=ws://host/ws in .env)
    const envUrl = import.meta.env.VITE_WS_URL as string | undefined;
    if (envUrl) return `${envUrl}?token=${accessToken}`;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    const port = window.location.port;

    // Port 3000 = raw df-frontend (no /ws proxy).
    // Remap to port 80 = df-nginx (has /ws → backend proxy).
    // Port 80 / '' = already on the reverse proxy — use same origin.
    const wsPort = port === '3000' ? '80' : port;
    const host = wsPort && wsPort !== '80' ? `${hostname}:${wsPort}` : hostname;

    return `${protocol}//${host}/ws?token=${accessToken}`;
  }, [accessToken]);

  // ── Core connect ─────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!mountedRef.current) return;
    if (!isAuthenticated || !accessToken) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    try {
      const ws = new WebSocket(getWsUrl());

      ws.onopen = () => {
        if (!mountedRef.current) { ws.close(); return; }
        setIsConnected(true);
        reconnectAttemptRef.current = 0;
        console.debug('[WS] Connected to', ws.url.replace(/token=.*/, 'token=***'));
      };

      ws.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data as string);
          // Server-side keep-alive ping
          if (msg.type === 'ping') {
            ws.send('pong');
            return;
          }
          setLastMessage(msg);
          // Dispatch to type-specific handlers
          handlersRef.current.get(msg.type)?.forEach((h) => h(msg));
          // Dispatch to wildcard handlers
          handlersRef.current.get('*')?.forEach((h) => h(msg));
        } catch {
          /* non-JSON frame — pong etc. */
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        wsRef.current = null;
        console.debug(`[WS] Disconnected (code=${event.code})`);

        // 4001 = auth failure — do NOT reconnect
        if (event.code === 4001) return;
        if (!mountedRef.current) return;

        const attempt = reconnectAttemptRef.current;
        const delay = RECONNECT_DELAYS[Math.min(attempt, RECONNECT_DELAYS.length - 1)];
        reconnectAttemptRef.current = attempt + 1;
        console.debug(`[WS] Reconnecting in ${delay}ms (attempt ${attempt + 1})`);
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        // onclose fires after onerror — reconnect handled there
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[WS] Connection error:', err);
    }
  }, [isAuthenticated, accessToken, getWsUrl]);

  // ── Lifecycle ─────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    if (isAuthenticated && accessToken) {
      connect();
    }
    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
        wsRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, accessToken]);

  // ── Subscribe API ─────────────────────────────────────────────────
  const subscribe = useCallback(
    (eventType: string, handler: MessageHandler): (() => void) => {
      if (!handlersRef.current.has(eventType)) {
        handlersRef.current.set(eventType, new Set());
      }
      handlersRef.current.get(eventType)!.add(handler);
      return () => {
        handlersRef.current.get(eventType)?.delete(handler);
      };
    },
    [],
  );

  return (
    <WSContext.Provider value={{ isConnected, lastMessage, subscribe }}>
      {children}
    </WSContext.Provider>
  );
}

// ── Consumer hook ─────────────────────────────────────────────────────

export function useWebSocketCtx(): WSContextValue {
  return useContext(WSContext);
}
