import { useCallback } from 'react';
import { useToast } from '@/src/contexts/ToastContext';

type ToastKind = 'success' | 'error' | 'info';

/** Parent portal toasts — calmer, ambient, emotionally distinct from child feedback. */
export function useParentToast() {
  const { showToast } = useToast();

  const showParentToast = useCallback(
    (message: string, kind: ToastKind = 'success') => {
      showToast(message, kind, { ambient: kind !== 'error' });
    },
    [showToast]
  );

  return { showParentToast, showToast };
}
