'use client';

import '../lib/storage-migration';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatState = {
  messages: Message[];
  /** Question handed over from another screen; ChatPanel sends it once and clears it. */
  pendingPrompt: string | null;
  setPendingPrompt: (prompt: string | null) => void;
  addMessage: (message: Message) => void;
  resetMessages: () => void;
};

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      pendingPrompt: null,
      setPendingPrompt: (prompt) => set({ pendingPrompt: prompt }),
      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),
      resetMessages: () => set({ messages: [] }),
    }),
    { name: 'pulso-chat-v2', partialize: (state) => ({ messages: state.messages }) },
  ),
);
