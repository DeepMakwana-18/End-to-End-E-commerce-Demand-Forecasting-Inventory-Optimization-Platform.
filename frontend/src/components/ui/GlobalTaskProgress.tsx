/**
 * GlobalTaskProgress — Floating task progress bar shown during active
 * background tasks (retraining, anomaly scans, reports).
 *
 * Listens to task.* WS events and shows a compact progress pill anchored
 * to the top of the viewport. Dismisses automatically on completion/failure.
 *
 * Only one active task is tracked at a time (last-writer-wins).
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';

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
  const [task, setTask] = useState<ActiveTask | null>(null);

  useEffect(() => {
    const unsubs: Array<() => void> = [];

    const getTaskName = (payload: Record<string, unknown>) =>
      TASK_NAME_MAP[(payload?.task_name as string) ?? ''] ??
      (payload?.task_name as string) ??
      'Background Task';

    // Task started
    unsubs.push(
      subscribe('task.started', (msg) => {
        const p = msg.data?.payload as Record<string, unknown> | undefined;
        if (!p?.task_id) return;
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
        setTimeout(() => setTask(null), AUTO_DISMISS_MS);
      }),
    );

    // Task failed
    unsubs.push(
      subscribe('task.failed', (msg) => {
        const p = msg.data?.payload as Record<string, unknown> | undefined;
        if (!p?.task_id) return;
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
        setTimeout(() => setTask(null), AUTO_DISMISS_MS + 2_000);
      }),
    );

    return () => unsubs.forEach((fn) => fn());
  }, [subscribe]);

  return (
    <AnimatePresence>
      {task && (
        <motion.div
          key={task.taskId}
          initial={{ opacity: 0, y: -48 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -48 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[9998]
                     flex items-center gap-3 px-4 py-2.5 rounded-2xl
                     bg-surface-900/95 border border-surface-700/80
                     backdrop-blur-xl shadow-2xl min-w-[280px] max-w-[420px]"
        >
          {/* Status icon */}
          <div className="flex-shrink-0">
            {task.state === 'completed' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : task.state === 'failed' ? (
              <XCircle className="w-4 h-4 text-red-400" />
            ) : (
              <Loader2 className="w-4 h-4 text-primary-400 animate-spin" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-xs font-semibold text-surface-200 truncate">
                {task.taskName}
              </p>
              {task.state !== 'failed' && (
                <span className="text-[10px] font-mono text-surface-400 flex-shrink-0">
                  {task.progress}%
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="h-1 rounded-full bg-surface-800/80 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  task.state === 'completed'
                    ? 'bg-emerald-500'
                    : task.state === 'failed'
                    ? 'bg-red-500'
                    : 'gradient-primary'
                }`}
                animate={{ width: `${task.state === 'failed' ? 100 : task.progress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>

            <p className="text-[10px] text-surface-500 mt-1 truncate">
              {task.message}
            </p>
          </div>

          {/* Dismiss */}
          <button
            onClick={() => setTask(null)}
            className="flex-shrink-0 text-surface-600 hover:text-surface-400 transition"
            aria-label="Dismiss"
          >
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
