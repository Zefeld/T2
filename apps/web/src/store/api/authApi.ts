import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ApiResponse } from './baseApi';

// Types
export interface User {
  id: string;
  email: string;
  role: 'employee' | 'hr_specialist' | 'hr_manager' | 'team_lead' | 'admin' | 'system';
  status: 'active' | 'inactive' | 'suspended' | 'deleted';
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  dataProcessingConsent: boolean;
  consentDate?: string;
}

export interface SessionInfo {
  id: string;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  expiresIn: number;
  returnUrl?: string;
  suspicious?: boolean;
}

export interface MeResponse {
  user: User;
  permissions: string[];
  sessionInfo: SessionInfo;
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}

export interface LogoutRequest {
  allDevices?: boolean;
}

// Auth API
export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.REACT_APP_API_URL || 'http://localhost:3000',
    credentials: 'include',
    prepareHeaders: (headers) => {
      headers.set('content-type', 'application/json');
      
      // Set CSRF token if available
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
      if (csrfToken) {
        headers.set('x-csrf-token', csrfToken);
      }
      
      return headers;
    },
  }),
  tagTypes: ['Auth', 'Session'],
  endpoints: (builder) => ({
    // Get current user info
    getMe: builder.query<MeResponse, void>({
      query: () => '/api/auth/me',
      providesTags: ['Auth'],
    }),
    
    // Refresh access token
    refreshToken: builder.mutation<RefreshResponse, { refreshToken?: string }>({
      query: (body) => ({
        url: '/api/auth/refresh',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Auth'],
    }),
    
    // Logout
    logout: builder.mutation<ApiResponse, LogoutRequest>({
      query: (body) => ({
        url: '/api/auth/logout',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Auth', 'Session'],
    }),
    
    // Get user sessions
    getSessions: builder.query<ApiResponse<SessionInfo[]>, void>({
      query: () => '/api/auth/sessions',
      providesTags: ['Session'],
    }),
    
    // Delete specific session
    deleteSession: builder.mutation<ApiResponse, string>({
      query: (sessionId) => ({
        url: `/api/auth/sessions/${sessionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Session'],
    }),
    
    // Delete all sessions except current
    deleteAllSessions: builder.mutation<ApiResponse, void>({
      query: () => ({
        url: '/api/auth/sessions',
        method: 'DELETE',
      }),
      invalidatesTags: ['Session'],
    }),
    
    // Check session status
    checkSession: builder.query<ApiResponse<{ valid: boolean; expiresAt: string }>, void>({
      query: () => '/api/auth/session/status',
      providesTags: ['Session'],
    }),
    
    // Update user consent
    updateConsent: builder.mutation<ApiResponse, { dataProcessingConsent: boolean }>({
      query: (body) => ({
        url: '/api/auth/consent',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Auth'],
    }),
    
    // Request data export (GDPR)
    requestDataExport: builder.mutation<ApiResponse<{ exportId: string }>, void>({
      query: () => ({
        url: '/api/auth/data-export',
        method: 'POST',
      }),
    }),
    
    // Request account deletion (GDPR)
    requestAccountDeletion: builder.mutation<ApiResponse, { reason?: string }>({
      query: (body) => ({
        url: '/api/auth/delete-account',
        method: 'POST',
        body,
      }),
    }),
    
    // Get audit log for current user
    getAuditLog: builder.query<ApiResponse<any[]>, { page?: number; limit?: number }>({
      query: ({ page = 1, limit = 20 }) => 
        `/api/auth/audit?page=${page}&limit=${limit}`,
    }),
  }),
});

// Export hooks
export const {
  useGetMeQuery,
  useRefreshTokenMutation,
  useLogoutMutation,
  useGetSessionsQuery,
  useDeleteSessionMutation,
  useDeleteAllSessionsMutation,
  useCheckSessionQuery,
  useUpdateConsentMutation,
  useRequestDataExportMutation,
  useRequestAccountDeletionMutation,
  useGetAuditLogQuery,
} = authApi;