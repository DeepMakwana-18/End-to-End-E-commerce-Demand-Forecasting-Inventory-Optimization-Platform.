/**
 * useRealtimeKPIs — Invalidates React Query cache on WebSocket events.
 *
 * Listens for domain events (forecast.generated, model.retrained, etc.)
 * and triggers React Query cache invalidation so dashboards refresh
 * automatically without polling.
 */

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';

const EVENT_TO_QUERY_KEYS: Record<string, string[][]> = {
  'forecast.generated': [['forecast'], ['dashboard']],
  'model.retrained': [['forecast'], ['dashboard'], ['model-info']],
  'inventory.critical': [['inventory'], ['dashboard'], ['alerts']],
  'inventory.updated': [['inventory'], ['dashboard']],
  'alert.triggered': [['alerts'], ['dashboard']],
  'alert.resolved': [['alerts'], ['dashboard']],
  'report.generated': [['reports']],
};

export function useRealtimeKPIs() {
  const { subscribe } = useWebSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    for (const [eventType, queryKeys] of Object.entries(EVENT_TO_QUERY_KEYS)) {
      const unsub = subscribe(eventType, () => {
        for (const key of queryKeys) {
          queryClient.invalidateQueries({ queryKey: key });
        }
      });
      unsubscribers.push(unsub);
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [subscribe, queryClient]);
}
