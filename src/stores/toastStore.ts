import { create } from "zustand";

export type ToastVariant = "success" | "info" | "warning" | "error";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastState {
  toasts: Toast[];
  addToast: (
    message: string,
    variant?: ToastVariant,
    duration?: number,
  ) => void;
  removeToast: (id: string) => void;
}

// Default durations per variant
const DEFAULT_DURATIONS: Record<ToastVariant, number> = {
  success: 3000,
  info: 3000,
  warning: 5000,
  error: 5000,
};

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (message, variant = "info", duration) => {
    const id = crypto.randomUUID();
    const finalDuration = duration ?? DEFAULT_DURATIONS[variant];

    set((state) => ({
      toasts: [
        ...state.toasts,
        { id, message, variant, duration: finalDuration },
      ],
    }));

    // Auto-remove after duration
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, finalDuration);
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

// Convenience functions for use outside of React components
export const toast = {
  success: (message: string, duration?: number) =>
    useToastStore.getState().addToast(message, "success", duration),
  info: (message: string, duration?: number) =>
    useToastStore.getState().addToast(message, "info", duration),
  warning: (message: string, duration?: number) =>
    useToastStore.getState().addToast(message, "warning", duration),
  error: (message: string, duration?: number) =>
    useToastStore.getState().addToast(message, "error", duration),
};
