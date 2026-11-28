/**
 * GlobalTaskProgress — Floating task progress bar shown during active
 * background tasks (retraining, anomaly scans, reports).
 *
 * Listens to task.* WS events and shows a compact progress pill anchored
 * to the top of the viewport. Dismisses automatically on completion/failure.
 *
 * Only one active task is tracked at a time (last-writer-wins).
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { TitanMark } from '@/components/ui/TitanMark';

interface ActiveTask {
  taskId: string;
  taskName: string;
  state: 'started' | 'progress' | 'completed' | 'failed';
  progress: number;
  message: string;
}

const TASK_NAME_MAP: Record<string, string> = {
  'titan.ml.retrain_model': 'Model Retraining',
  'titan.ml.reset_model':   'Model Reset',
  'titan.anomaly.scan':     'Anomaly Scan',
  'titan.reports.generate': 'Report Generation',
};

const AUTO_DISMISS_MS = 3_500;

export function GlobalTaskProgress() {
  const { subscribe } = useWebSocket();
  const prefersReducedMotion = useReducedMotion();
  const [task, setTask] = useState<ActiveTask | null>(null);
  const dismissTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const unsubs: Array<() => void> = [];

    const clearDismissTimer = () => {
      if (dismissTimerRef.current !== null) {
        window.clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };

    const getTaskName = (payload: Record<string, unknown>) =>
      TASK_NAME_MAP[(payload?.task_name as string) ?? ''] ??
      (payload?.task_name as string) ??
      'Background Task';

    // Task started
    unsubs.push(
      subscribe('task.started', (msg) => {
        const p = msg.data?.payload as Record<string, unknown> | undefined;
        if (!p?.task_id) return;
        clearDismissTimer();
        setTask({
          taskId: p.task_id as string,
          taskName: getTaskName(p),
          state: 'started',
          progress: 0,
          message: (p.message as string) || 'Starting...',
        });
      }),
    );

    // Task progress
    unsubs.push(
      subscribe('task.progress', (msg) => {
        const p = msg.data?.payload as Record<string, unknown> | undefined;
        if (!p?.task_id) return;
        setTask((prev) => {
          if (prev && prev.taskId !== p.task_id) return prev;
          return {
            taskId: p.task_id as string,
            taskName: prev?.taskName ?? getTaskName(p),
            state: 'progress',
            progress: (p.progress as number) ?? prev?.progress ?? 0,
            message: (p.message as string) || prev?.message || '',
          };
        });
      }),
    );

    // Task completed
    unsubs.push(
      subscribe('task.completed', (msg) => {
        const p = msg.data?.payload as Record<string, unknown> | undefined;
        if (!p?.task_id) return;
        clearDismissTimer();
        setTask((prev) => {
          if (prev && prev.taskId !== p.task_id) return prev;
          return {
            taskId: p.task_id as string,
            taskName: prev?.taskName ?? getTaskName(p),
            state: 'completed',
            progress: 100,
            message: (p.message as string) || 'Completed',
          };
        });
        dismissTimerRef.current = window.setTimeout(() => setTask(null), AUTO_DISMISS_MS);
      }),
    );

    // Task failed
    unsubs.push(
      subscribe('task.failed', (msg) => {
        const p = msg.data?.payload as Record<string, unknown> | undefined;
        if (!p?.task_id) return;
        clearDismissTimer();
        setTask((prev) => {
          if (prev && prev.taskId !== p.task_id) return prev;
          return {
            taskId: p.task_id as string,
            taskName: prev?.taskName ?? getTaskName(p),
            state: 'failed',
            progress: 0,
            message: (p.error as string) || 'Task failed',
          };
        });
        dismissTimerRef.current = window.setTimeout(() => setTask(null), AUTO_DISMISS_MS + 2_000);
      }),
    );

    return () => {
      clearDismissTimer();
      unsubs.forEach((fn) => fn());
    };
  }, [subscribe]);

  const statusAnnouncement = task
    ? task.state === 'completed'
      ? `${task.taskName} completed`
      : task.state === 'failed'
        ? `${task.taskName} failed`
        : `${task.taskName} in progress`
    : '';

  return (
    <>
      <span className="sr-only" role="status" aria-live="polite">
        {statusAnnouncement}
      </span>
      <AnimatePresence>
        {task && (
          <motion.div
            key={task.taskId}
            initial={prefersReducedMotion ? false : { opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? undefined : { opacity: 0, y: -24 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-3 left-1/2 -translate-x-1/2 z-[9998]
                       flex items-center gap-3 px-4 py-2.5 rounded-[12px]
                       bg-ds-surface border border-ds-hairline
                       shadow-ds-float-2 min-w-[300px] max-w-[440px]"
          >
            {/* Status icon */}
            <div className="flex-shrink-0">
              {task.state === 'completed' ? (
                <CheckCircle2 className="w-4 h-4 text-ds-green" aria-hidden="true" />
              ) : task.state === 'failed' ? (
                <XCircle className="w-4 h-4 text-ds-red" aria-hidden="true" />
              ) : (
                <TitanMark size={18} mode="pulse" decorative className="text-ds-blue" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-xs font-semibold text-ds-text-primary truncate">
                  {task.taskName}
                </p>
                {task.state !== 'failed' && (
                  <span aria-live="off" className="text-[11px] font-mono text-ds-text-secondary tabular-nums flex-shrink-0">
                    {task.progress}%
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div className="h-1 rounded-full bg-ds-surface-sunken overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    task.state === 'completed'
                      ? 'bg-ds-green'
                      : task.state === 'failed'
                      ? 'bg-ds-red'
                      : 'bg-ds-blue'
                  }`}
                  animate={{ width: `${task.state === 'failed' ? 100 : task.progress}%` }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.35, ease: 'easeOut' }}
                />
              </div>

              <p aria-live="off" className="text-[11px] text-ds-text-secondary mt-1 truncate">
                {task.message}
              </p>
            </div>

            {/* Dismiss */}
            <button
              type="button"
              onClick={() => setTask(null)}
              className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-ds-text-secondary hover:text-ds-text-primary hover:bg-ds-surface-sunken transition-colors cursor-pointer"
              aria-label="Dismiss task progress"
            >
              ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
