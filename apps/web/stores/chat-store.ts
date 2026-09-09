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
            'Puedo analizar tu sueño, recuperación, actividad, lesiones y nutrición. Pregúntame “¿cómo estoy hoy y qué debería hacer?”.',
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
                'Puedo analizar tu sueño, recuperación, actividad, lesiones y nutrición. Pregúntame “¿cómo estoy hoy y qué debería hacer?”.',
            },
          ],
        }),
    }),
    { name: 'recoveryos-chat-v1' },
  ),
);
