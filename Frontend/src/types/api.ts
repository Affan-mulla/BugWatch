export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiErrorResponse {
  message: string;
  status: number;
  code?: string;
}
