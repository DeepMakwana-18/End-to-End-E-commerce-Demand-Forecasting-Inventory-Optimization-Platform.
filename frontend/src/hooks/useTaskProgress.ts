/**
 * useTaskProgress — Poll/stream task progress for async Celery jobs.
 *
 * Combines HTTP polling (fallback) with WebSocket events (realtime)
 * to track the progress of background tasks like model retraining.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import api from '@/services/api';

export interface TaskStatus {
  state: 'pending' | 'started' | 'progress' | 'completed' | 'failed';
  progress: number;
  message: string;
  result?: Record<string, unknown>;
  error?: string;
}

const POLL_INTERVAL = 2000; // 2 seconds

export function useTaskProgress(taskId: string | null) {
  const [status, setStatus] = useState<TaskStatus | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const { subscribe } = useWebSocket();
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Poll via HTTP as fallback
  const poll = useCallback(async () => {
    if (!taskId) return;
    try {
      const res = await api.get(`/tasks/${taskId}`);
      const data = res.data as TaskStatus;
      setStatus(data);

      if (data.state === 'completed' || data.state === 'failed') {
        setIsTracking(false);
        clearInterval(pollTimerRef.current);
      }
    } catch {
      // Task not found yet — keep polling
    }
  }, [taskId]);

  useEffect(() => {
    if (!taskId) {
      setStatus(null);
      setIsTracking(false);
      return;
    }

    setIsTracking(true);

    // Start HTTP polling
    poll();
    pollTimerRef.current = setInterval(poll, POLL_INTERVAL);

    // Also listen for WebSocket task events
    const unsub1 = subscribe('task.progress', (msg) => {
      const payload = msg.data?.payload as Record<string, unknown> | undefined;
      if (payload?.task_id === taskId) {
        setStatus({
          state: 'progress',
          progress: (payload.progress as number) || 0,
          message: (payload.message as string) || '',
        });
      }
    });

    const unsub2 = subscribe('task.completed', (msg) => {
      const payload = msg.data?.payload as Record<string, unknown> | undefined;
      if (payload?.task_id === taskId) {
        setStatus({
          state: 'completed',
          progress: 100,
          message: (payload.message as string) || 'Task completed',
          result: payload.result as Record<string, unknown> | undefined,
        });
        setIsTracking(false);
        clearInterval(pollTimerRef.current);
      }
    });

    const unsub3 = subscribe('task.failed', (msg) => {
      const payload = msg.data?.payload as Record<string, unknown> | undefined;
      if (payload?.task_id === taskId) {
        setStatus({
          state: 'failed',
          progress: 0,
          message: (payload.message as string) || 'Task failed',
          error: (payload.error as string) || undefined,
        });
        setIsTracking(false);
        clearInterval(pollTimerRef.current);
      }
    });

    return () => {
      clearInterval(pollTimerRef.current);
      unsub1();
      unsub2();
      unsub3();
    };
  }, [taskId, subscribe, poll]);

  return { status, isTracking };
}
