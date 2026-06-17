'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SessionUser = {
  id: string;
  email: string;
  name?: string;
  sessionToken?: string;
};

type SessionState = {
  user: SessionUser | null;
  setUser: (user: SessionUser) => void;
  clearUser: () => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    {
      name: 'recoveryos-session',
    },
  ),
);

