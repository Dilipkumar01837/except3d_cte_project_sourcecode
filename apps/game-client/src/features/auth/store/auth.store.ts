import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/shared/lib/auth-api';
import type { AuthState, UserProfile } from '@/shared/types/auth';

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    username: string;
    password: string;
    displayName?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateProfile: (data: {
    displayName?: string;
    bio?: string;
    avatarUrl?: string | null;
  }) => Promise<void>;
  clearError: () => void;
  setUser: (user: UserProfile) => void;
}

type AuthStore = AuthState & AuthActions;

function extractErrorMessage(err: unknown, fallback: string): string {
  if (typeof err !== 'object' || err === null) return fallback;
  const r = (err as Record<string, unknown>)['response'];
  if (typeof r !== 'object' || r === null) return fallback;
  const d = (r as Record<string, unknown>)['data'];
  if (typeof d !== 'object' || d === null) return fallback;
  const e = (d as Record<string, unknown>)['error'];
  if (typeof e !== 'object' || e === null) return fallback;
  const error = e as Record<string, unknown>;
  const details = error['details'];
  if (Array.isArray(details) && details.length > 0) {
    const firstDetail = details[0];
    if (typeof firstDetail === 'object' && firstDetail !== null) {
      const detailMessage = (firstDetail as Record<string, unknown>)['message'];
      if (typeof detailMessage === 'string') return detailMessage;
    }
  }
  const msg = error['message'];
  return typeof msg === 'string' ? msg : fallback;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user) => set({ user }),

      clearError: () => set({ error: null }),

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const { accessToken, user } = await authApi.login({ email, password });
          localStorage.setItem('access_token', accessToken);
          set({ user, accessToken, isAuthenticated: true, isLoading: false });
        } catch (err: unknown) {
          set({ error: extractErrorMessage(err, 'Login failed'), isLoading: false });
          throw err;
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const { accessToken, user } = await authApi.register(data);
          localStorage.setItem('access_token', accessToken);
          set({ user, accessToken, isAuthenticated: true, isLoading: false });
        } catch (err: unknown) {
          set({ error: extractErrorMessage(err, 'Registration failed'), isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        try {
          await authApi.logout();
        } finally {
          localStorage.removeItem('access_token');
          set({ user: null, accessToken: null, isAuthenticated: false });
        }
      },

      loadUser: async () => {
        const { accessToken, user } = get();
        if (!accessToken) return;
        // Only block the UI on the initial session hydrate — background refreshes
        // must not flip isLoading or ProtectedRoute will unmount its children.
        const isInitialLoad = !user;
        if (isInitialLoad) set({ isLoading: true });
        try {
          const fetchedUser = await authApi.getMe();
          set({ user: fetchedUser, isAuthenticated: true, isLoading: false });
        } catch {
          localStorage.removeItem('access_token');
          set({ user: null, accessToken: null, isAuthenticated: false, isLoading: false });
        }
      },

      updateProfile: async (data) => {
        set({ isLoading: true, error: null });
        try {
          await authApi.updateProfile(data);
          const user = await authApi.getMe();
          set({ user, isLoading: false });
        } catch (err: unknown) {
          set({ error: extractErrorMessage(err, 'Update failed'), isLoading: false });
          throw err;
        }
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
