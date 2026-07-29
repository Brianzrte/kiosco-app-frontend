"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import {
  IconAlert,
  IconCheckCircle,
  IconInfoCircle,
} from "@/components/ui/icons";

type ToastTone = "success" | "error" | "warning" | "info";

type Toast = { id: number; tone: ToastTone; message: string };

const tones: Record<ToastTone, string> = {
  success: "border-success text-success",
  error: "border-error text-error",
  warning: "border-warning text-warning",
  info: "border-info text-info",
};

// Decorative — the toast's text always carries the message on its own;
// see ui-system.md, "estado nunca comunicado sólo por color".
const toneIcons: Record<ToastTone, typeof IconCheckCircle> = {
  success: IconCheckCircle,
  error: IconAlert,
  warning: IconAlert,
  info: IconInfoCircle,
};

const ToastContext = createContext<(tone: ToastTone, message: string) => void>(
  () => {},
);

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const show = useCallback((tone: ToastTone, message: string) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, tone, message }]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2"
      >
        {toasts.map((toast) => {
          const ToneIcon = toneIcons[toast.tone];
          return (
            <div
              key={toast.id}
              className={`pop-in flex items-start gap-2.5 rounded-app border bg-surface-raised px-4 py-3 text-sm font-medium shadow-soft-lg ${tones[toast.tone]}`}
            >
              <ToneIcon className="mt-0.5 size-4.5 shrink-0" />
              <span className="text-text-primary">{toast.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
