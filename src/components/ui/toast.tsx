import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { Toast as ToastType, ToastVariant } from "@/stores/toastStore";

const variantStyles: Record<ToastVariant, string> = {
  success: "bg-green-600 text-white",
  info: "bg-blue-600 text-white",
  warning: "bg-amber-500 text-black",
  error: "bg-red-600 text-white",
};

const variantIcons: Record<ToastVariant, string> = {
  success: "✓",
  info: "ℹ",
  warning: "⚠",
  error: "✕",
};

interface ToastProps {
  toast: ToastType;
  onClose: (id: string) => void;
}

export function Toast({ toast, onClose }: ToastProps): React.ReactNode {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => {
      setIsVisible(true);
    });

    // Trigger exit animation before removal
    const exitTimer = setTimeout(() => {
      setIsLeaving(true);
    }, toast.duration - 300);

    return () => {
      clearTimeout(exitTimer);
    };
  }, [toast.duration]);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "flex items-center gap-2 rounded-lg px-4 py-3 shadow-lg",
        "transition-all duration-300 ease-out",
        variantStyles[toast.variant],
        isVisible && !isLeaving
          ? "translate-y-0 opacity-100"
          : "translate-y-4 opacity-0",
      )}
    >
      <span className="text-lg" aria-hidden="true">
        {variantIcons[toast.variant]}
      </span>
      <span className="flex-1 text-sm font-medium">{toast.message}</span>
      <button
        type="button"
        onClick={() => onClose(toast.id)}
        className={cn(
          "min-h-8 min-w-8 rounded-md p-1",
          "transition-colors hover:bg-black/20",
          "touch-manipulation",
        )}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
