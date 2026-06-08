/**
 * WSNotifications — Bridges WebSocket domain events to toast notifications.
 *
 * Mounted once at the app root. Listens to all relevant events and fires
 * toasts. Keeps toast logic out of individual pages.
 *
 * Event → Toast mapping:
 *   anomaly.detected         → warning  (N anomalies found)
 *   alert.triggered          → error    (inventory alert)
 *   model.retrained          → success  (retrain complete)
 *   model.reset              → info     (model reset)
 *   task.failed              → error    (any task failure)
 *   report.generated         → success  (report ready)
 *   anomaly.scan.completed   → info     (quiet — only if anomalies found)
 */

import { useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { toast } from '@/hooks/useToast';

export function WSNotifications() {
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubs: Array<() => void> = [];

    // Anomaly detected — always show; critical gets error level
    unsubs.push(
      subscribe('anomaly.detected', (msg) => {
        const p = msg.data?.payload as Record<string, unknown> | undefined;
        const count = (p?.count as number) ?? 0;
        const critical = (p?.critical_count as number) ?? 0;
        if (count === 0) return;

        if (critical > 0) {
          toast.error(
            `🚨 ${critical} Critical Anomal${critical === 1 ? 'y' : 'ies'} Detected`,
            `${count} total anomalies found — check Anomaly Intelligence`,
          );
        } else {
          toast.warning(
            `⚠️ ${count} Anomal${count === 1 ? 'y' : 'ies'} Detected`,
            'Check Anomaly Intelligence for details',
          );
        }
      }),
    );

    // Alert triggered
    unsubs.push(
      subscribe('alert.triggered', (msg) => {
        const p = msg.data?.payload as Record<string, unknown> | undefined;
        const message = (p?.message as string) || 'An inventory alert was triggered';
        toast.error('🔔 Alert Triggered', message);
      }),
    );

    // Model retrained
    unsubs.push(
      subscribe('model.retrained', (msg) => {
        const p = msg.data?.payload as Record<string, unknown> | undefined;
        const version = (p?.version_tag as string) || '';
        const accuracy = typeof p?.accuracy === 'number'
          ? ` — ${(p.accuracy * 100).toFixed(1)}% accuracy`
          : '';
        toast.success(
          '🤖 Model Retrained',
          `${version}${accuracy} — dashboard refreshing`,
        );
      }),
    );

    // Model reset to synthetic baseline
    unsubs.push(
      subscribe('model.reset', (msg) => {
        const p = msg.data?.payload as Record<string, unknown> | undefined;
        const version = (p?.version_tag as string) || '';
        toast.info('🔄 Model Reset', `Baseline model ${version} is now active`);
      }),
    );

    // Any task failure
    unsubs.push(
      subscribe('task.failed', (msg) => {
        const p = msg.data?.payload as Record<string, unknown> | undefined;
        const taskName = (p?.task_name as string) || 'Background task';
        const error = (p?.error as string) || 'Unknown error';
        toast.error(`❌ ${taskName} Failed`, error.slice(0, 80));
      }),
    );

    // Report generated
    unsubs.push(
      subscribe('report.generated', (msg) => {
        const p = msg.data?.payload as Record<string, unknown> | undefined;
        const name = (p?.report_name as string) || 'Report';
        toast.success('📊 Report Ready', `${name} is ready to download`);
      }),
    );

    // Anomaly scan completed — only notify if anomalies were found
    unsubs.push(
      subscribe('anomaly.scan.completed', (msg) => {
        const p = msg.data?.payload as Record<string, unknown> | undefined;
        const detected = (p?.detected as number) ?? 0;
        const trigger = (p?.trigger as string) ?? '';
        // Silent for automated nightly scans with no findings
        if (detected > 0 && trigger !== 'nightly') {
          toast.info(
            `🔍 Scan Complete`,
            `${detected} anomal${detected === 1 ? 'y' : 'ies'} found`,
          );
        }
      }),
    );

    return () => unsubs.forEach((fn) => fn());
  }, [subscribe]);

  // Renders nothing — pure side-effect component
  return null;
}
