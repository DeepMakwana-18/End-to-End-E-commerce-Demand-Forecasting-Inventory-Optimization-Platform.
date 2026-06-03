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
  success: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
  error: 'bg-red-500/15 border-red-500/30 text-red-300',
  warning: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
  info: 'bg-blue-500/15 border-blue-500/30 text-blue-300',
};

const ICON_COLORS: Record<string, string> = {
  success: 'bg-emerald-500/20 text-emerald-400',
  error: 'bg-red-500/20 text-red-400',
  warning: 'bg-amber-500/20 text-amber-400',
  info: 'bg-blue-500/20 text-blue-400',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm shadow-lg max-w-sm cursor-pointer ${COLORS[toast.type]}`}
      onClick={onDismiss}
    >
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-bold ${ICON_COLORS[toast.type]}`}>
        {ICONS[toast.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{toast.title}</p>
        {toast.message && (
          <p className="text-xs opacity-75 mt-0.5 truncate">{toast.message}</p>
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
