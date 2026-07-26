export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta: {
    timestamp: string;
  };
}

export interface HealthStatus {
  status: 'ok';
}

export interface AppError {
  code: string;
  message: string;
  details?: Array<{ field: string; message: string }>;
}
