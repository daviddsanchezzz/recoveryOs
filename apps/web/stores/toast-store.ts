'use client';

import { create } from 'zustand';

export type ToastType = 'error' | 'success' | 'info';

export type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastStore = {
  toasts: Toast[];
  add: (toast: Omit<Toast, 'id'>) => void;
  remove: (id: string) => void;
};

const AUTO_DISMISS_MS = 4500;

export const useToastStore = create<ToastStore>()((set) => ({
  toasts: [],
  add: ({ message, type }) => {
    const id = crypto.randomUUID();
    // Keep at most 3 toasts visible at once
    set((state) => ({ toasts: [...state.toasts.slice(-2), { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, AUTO_DISMISS_MS);
  },
  remove: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

// Imperative API — safe to call from services.ts / outside React
export const toast = {
  error:   (message: string) => useToastStore.getState().add({ message, type: 'error' }),
  success: (message: string) => useToastStore.getState().add({ message, type: 'success' }),
  info:    (message: string) => useToastStore.getState().add({ message, type: 'info' }),
};
