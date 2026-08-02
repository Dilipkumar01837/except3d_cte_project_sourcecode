import axios, { type InternalAxiosRequestConfig } from 'axios';

const STORAGE_KEY = 'admin_access_token';

export const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEY);
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: Error) => void }> = [];

function processQueue(error: Error | null, token: string | null) {
  for (const prom of failedQueue) {
    if (error) prom.reject(error);
    else if (token) prom.resolve(token);
  }
  failedQueue = [];
}

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(new Error(String(error)));

    const originalRequest = error.config as RetryConfig | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post<{ data: { accessToken: string } }>(
          '/api/v1/auth/refresh',
          {},
          { withCredentials: true },
        );
        const newToken = data.data.accessToken;
        localStorage.setItem(STORAGE_KEY, newToken);
        processQueue(null, newToken);
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return await apiClient(originalRequest);
      } catch (refreshError) {
        const err = refreshError instanceof Error ? refreshError : new Error(String(refreshError));
        processQueue(err, null);
        localStorage.removeItem(STORAGE_KEY);
        window.location.href = '/login';
        return await Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  },
);

export const STORAGE_KEY_TOKEN = STORAGE_KEY;
