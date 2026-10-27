/**
 * ToastProvider — Renders toast notifications in a fixed position.
 *
 * Drop this component at the App root level.
 */

import { useToastStore, type Toast } from '@/hooks/useToast';
import { AnimatePresence, motion } from 'framer-motion';

const ICONS: Record<string, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
};

const COLORS: Record<string, string> = {
  success: 'border-ds-green/30 text-ds-text-primary',
  error: 'border-ds-red/30 text-ds-text-primary',
  warning: 'border-ds-orange/30 text-ds-text-primary',
  info: 'border-ds-blue/30 text-ds-text-primary',
};

const ICON_COLORS: Record<string, string> = {
  success: 'bg-ds-green-surface text-ds-green-text',
  error: 'bg-ds-red-surface text-ds-red-text',
  warning: 'bg-ds-orange-surface text-ds-orange-text',
  info: 'bg-ds-blue-surface text-ds-blue-on-surface',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
      className={`flex items-start gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl bg-ds-surface shadow-ds-float-2 max-w-sm cursor-pointer ${COLORS[toast.type]}`}
      onClick={onDismiss}
    >
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-sm border border-ds-hairline ${ICON_COLORS[toast.type]}`}>
        {ICONS[toast.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ds-text-primary">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-ds-text-muted mt-0.5 truncate">{toast.message}</p>
        )}
      </div>
    </motion.div>
  );
}

export function ToastProvider() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onDismiss={() => removeToast(t.id)} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
