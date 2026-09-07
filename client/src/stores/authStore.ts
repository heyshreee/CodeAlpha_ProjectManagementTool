import { create } from 'zustand';
import type { User } from '@/types';
import { api, authStore } from '@/lib/api';

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; bio?: string }) => Promise<User>;
  init: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  login: async (email, password) => {
    const data = await api.post<{ user: User; accessToken: string }>('/auth/login', { email, password });
    authStore.setToken(data.accessToken);
    set({ user: data.user });
    return data.user;
  },
  register: async (name, email, password) => {
    const data = await api.post<{ user: User; accessToken: string }>('/auth/register', {
      name,
      email,
      password,
    });
    authStore.setToken(data.accessToken);
    set({ user: data.user });
    return data.user;
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    authStore.clear();
    set({ user: null });
  },
  updateProfile: async (data) => {
    const { user } = await api.patch<{ user: User }>('/users/me', data);
    set({ user });
    return user;
  },
  init: async () => {
    if (!authStore.getToken()) {
      // Try to refresh from cookie to restore session.
      const data = await api
        .post<{ user: User; accessToken: string }>('/auth/refresh')
        .catch(() => null);
      if (data) {
        authStore.setToken(data.accessToken);
        set({ user: data.user });
      }
    } else {
      const data = await api.get<{ user: User }>('/users/me').catch(() => null);
      if (data) set({ user: data.user });
      else authStore.clear();
    }
    set({ initialized: true });
  },
}));
