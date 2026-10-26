export class ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: Record<string, unknown>;

  static ok<T>(data: T, message?: string, meta?: Record<string, unknown>): ApiResponse<T> {
    return { success: true, data, message, meta };
  }

  static fail(error: string, message?: string): ApiResponse<null> {
    return { success: false, error, message };
  }
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
