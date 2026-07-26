import { apiClient } from './api-client';
import type { UserProfile } from '../types/auth';

interface AuthResponse {
  accessToken: string;
  user: UserProfile;
}

interface ApiWrapper<T> {
  data: T;
}

export const authApi = {
  register: (data: { email: string; username: string; password: string; displayName?: string }) =>
    apiClient.post<ApiWrapper<AuthResponse>>('/auth/register', data).then((r) => r.data.data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<ApiWrapper<AuthResponse>>('/auth/login', data).then((r) => r.data.data),

  logout: () =>
    apiClient.post<ApiWrapper<{ message: string }>>('/auth/logout').then((r) => r.data.data),

  refresh: () =>
    apiClient.post<ApiWrapper<{ accessToken: string }>>('/auth/refresh').then((r) => r.data.data),

  forgotPassword: (email: string) =>
    apiClient
      .post<ApiWrapper<{ message: string }>>('/auth/forgot-password', { email })
      .then((r) => r.data.data),

  resetPassword: (token: string, password: string) =>
    apiClient
      .post<ApiWrapper<{ message: string }>>('/auth/reset-password', { token, password })
      .then((r) => r.data.data),

  getMe: () =>
    apiClient.get<ApiWrapper<{ user: UserProfile }>>('/auth/me').then((r) => r.data.data.user),

  updateProfile: (data: { displayName?: string; bio?: string; avatarUrl?: string | null }) =>
    apiClient.patch<ApiWrapper<unknown>>('/auth/profile', data).then((r) => r.data.data),

  deleteAccount: () =>
    apiClient.delete<ApiWrapper<{ message: string }>>('/auth/account').then((r) => r.data.data),
};
