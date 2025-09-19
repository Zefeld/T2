import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

// Base query with authentication
const baseQuery = fetchBaseQuery({
  baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:3000',
  credentials: 'include', // Include cookies
  prepareHeaders: (headers, { getState }) => {
    // Get token from state or cookie
    const state = getState() as RootState;
    const token = state.auth.token;
    
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    
    // Set content type
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }
    
    // Set CSRF token if available
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (csrfToken) {
      headers.set('x-csrf-token', csrfToken);
    }
    
    return headers;
  },
});

// Base query with re-authentication
const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQuery(args, api, extraOptions);
  
  // If we get a 401, try to refresh the token
  if (result.error && result.error.status === 401) {
    console.log('Token expired, attempting refresh...');
    
    // Try to refresh token
    const refreshResult = await baseQuery(
      {
        url: '/api/auth/refresh',
        method: 'POST',
      },
      api,
      extraOptions
    );
    
    if (refreshResult.data) {
      // Store the new token
      api.dispatch({ type: 'auth/setToken', payload: refreshResult.data });
      
      // Retry the original query
      result = await baseQuery(args, api, extraOptions);
    } else {
      // Refresh failed, redirect to login
      api.dispatch({ type: 'auth/logout' });
      window.location.href = '/auth/login';
    }
  }
  
  return result;
};

// Create the base API
export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'User',
    'Profile',
    'Session',
    'Analytics',
    'Gamification',
    'Achievement',
    'Course',
    'Job',
    'Recommendation',
    'Feedback',
    'Audit',
  ],
  endpoints: () => ({}),
});

// Export common types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiError {
  status: number;
  data: {
    success: false;
    error: string;
    message?: string;
    errors?: Record<string, string[]>;
  };
}

// Common query parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface SearchParams extends PaginationParams {
  search?: string;
  filters?: Record<string, any>;
}

// Helper function to handle API errors
export const handleApiError = (error: any): string => {
  if (error?.data?.message) {
    return error.data.message;
  }
  
  if (error?.data?.error) {
    return error.data.error;
  }
  
  if (error?.message) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred';
};

// Helper function to format validation errors
export const formatValidationErrors = (errors: Record<string, string[]>): string => {
  return Object.entries(errors)
    .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
    .join('; ');
};