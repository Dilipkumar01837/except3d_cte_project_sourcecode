import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient, STORAGE_KEY_TOKEN } from '@/shared/lib/api-client';

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: 'PLAYER' | 'MODERATOR' | 'ADMIN' | 'SUPER_ADMIN';
  profile: { displayName: string } | null;
}

interface AdminAuthState {
  user: AdminUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AdminAuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
}

type AdminAuthStore = AdminAuthState & AdminAuthActions;

function extractMessage(err: unknown, fallback: string): string {
  if (typeof err !== 'object' || err === null) return fallback;
  const r = (err as Record<string, unknown>)['response'];
  if (typeof r !== 'object' || r === null) return fallback;
  const d = (r as Record<string, unknown>)['data'];
  if (typeof d !== 'object' || d === null) return fallback;
  const e = (d as Record<string, unknown>)['error'];
  if (typeof e !== 'object' || e === null) return fallback;
  const msg = (e as Record<string, unknown>)['message'];
  return typeof msg === 'string' ? msg : fallback;
}

export const useAdminAuthStore = create<AdminAuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      clearError: () => {
        set({ error: null });
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await apiClient.post<{ data: { accessToken: string; user: AdminUser } }>(
            '/auth/login',
            { email, password },
          );
          const { accessToken, user } = res.data.data;
          if (user.role === 'PLAYER') {
            set({ error: 'Access denied: insufficient role', isLoading: false });
            return;
          }
          localStorage.setItem(STORAGE_KEY_TOKEN, accessToken);
          set({ user, accessToken, isAuthenticated: true, isLoading: false });
        } catch (err: unknown) {
          set({ error: extractMessage(err, 'Login failed'), isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try {
          await apiClient.post('/auth/logout');
        } finally {
          localStorage.removeItem(STORAGE_KEY_TOKEN);
          set({ user: null, accessToken: null, isAuthenticated: false });
        }
      },

      loadUser: async () => {
        const { accessToken } = get();
        if (!accessToken) return;
        set({ isLoading: true });
        try {
          const res = await apiClient.get<{ data: { user: AdminUser } }>('/auth/me');
          const { user } = res.data.data;
          if (user.role === 'PLAYER') {
            localStorage.removeItem(STORAGE_KEY_TOKEN);
            set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
            return;
          }
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          localStorage.removeItem(STORAGE_KEY_TOKEN);
          set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: 'admin-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
