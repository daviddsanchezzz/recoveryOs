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
  addMessage: (message: Message) => void;
  resetMessages: () => void;
};

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),
      resetMessages: () => set({ messages: [] }),
    }),
    { name: 'pulso-chat-v2' },
  ),
);
