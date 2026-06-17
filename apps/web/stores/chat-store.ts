'use client';

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
      messages: [
        {
          role: 'assistant',
          content:
            'Prueba comandos rapidos como "peso 70.2", "dolor 2", "rehab hecha" o "30 min bici".',
        },
      ],
      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),
      resetMessages: () =>
        set({
          messages: [
            {
              role: 'assistant',
              content:
                'Prueba comandos rapidos como "peso 70.2", "dolor 2", "rehab hecha" o "30 min bici".',
            },
          ],
        }),
    }),
    { name: 'recoveryos-chat-v1' },
  ),
);
