import axios, { type InternalAxiosRequestConfig } from 'axios';

export const apiClient = axios.create({
  baseURL: '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
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

// Auth endpoints own their own error handling. Refreshing on a 401 from login
// or register would replace the actionable error ("Invalid email or password")
// with a redirect, and refreshing the refresh endpoint itself would loop.
const isAuthEndpoint = (url?: string): boolean =>
  ['/auth/login', '/auth/register', '/auth/refresh'].some((path) => url?.includes(path) ?? false);

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(new Error(String(error)));

    const originalRequest = error.config as RetryConfig | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint(originalRequest.url)
    ) {
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
        localStorage.setItem('access_token', newToken);
        processQueue(null, newToken);
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return await apiClient(originalRequest);
      } catch (refreshError) {
        const err = refreshError instanceof Error ? refreshError : new Error(String(refreshError));
        processQueue(err, null);
        localStorage.removeItem('access_token');
        window.location.href = '/login';
        return await Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  },
);
