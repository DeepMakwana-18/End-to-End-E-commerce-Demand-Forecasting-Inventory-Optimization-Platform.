/**
 * useWebSocket — thin consumer hook for the global WS context.
 *
 * All components that previously called useWebSocket() continue to work
 * unchanged. The actual WebSocket lives in WSContext (singleton per app).
 *
 * Usage:
 *   const { isConnected, subscribe } = useWebSocket();
 *   const unsub = subscribe('model.retrained', (msg) => { ... });
 *   // call unsub() to unsubscribe
 */

export type { WSMessage } from '@/contexts/WSContext';
export { useWebSocketCtx as useWebSocket } from '@/contexts/WSContext';
