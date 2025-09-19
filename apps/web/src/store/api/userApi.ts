import { createApi } from '@reduxjs/toolkit/query/react';
import { baseApi, ApiResponse, PaginatedResponse, SearchParams } from './baseApi';

// Types
export interface UserProfile {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  timezone?: string;
  phoneNumber?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  skills: string[];
  interests: string[];
  languages: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  certifications: CertificationEntry[];
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface ExperienceEntry {
  id: string;
  company: string;
  position: string;
  description?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  skills: string[];
}

export interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  field: string;
  description?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  gpa?: number;
}

export interface CertificationEntry {
  id: string;
  name: string;
  issuer: string;
  description?: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    marketing: boolean;
  };
  privacy: {
    profileVisibility: 'public' | 'internal' | 'private';
    showEmail: boolean;
    showPhone: boolean;
    allowDirectMessages: boolean;
  };
  accessibility: {
    highContrast: boolean;
    reducedMotion: boolean;
    screenReader: boolean;
    fontSize: 'small' | 'medium' | 'large';
  };
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  bio?: string;
  location?: string;
  timezone?: string;
  phoneNumber?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  skills?: string[];
  interests?: string[];
  languages?: string[];
}

export interface UpdatePreferencesRequest {
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  timezone?: string;
  notifications?: Partial<UserPreferences['notifications']>;
  privacy?: Partial<UserPreferences['privacy']>;
  accessibility?: Partial<UserPreferences['accessibility']>;
}

export interface UserSearchFilters {
  role?: string[];
  skills?: string[];
  location?: string;
  department?: string;
  experience?: string;
}

// User API
export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get current user profile
    getMyProfile: builder.query<ApiResponse<UserProfile>, void>({
      query: () => '/api/users/profile',
      providesTags: ['Profile'],
    }),
    
    // Get user profile by ID
    getUserProfile: builder.query<ApiResponse<UserProfile>, string>({
      query: (userId) => `/api/users/${userId}/profile`,
      providesTags: (result, error, userId) => [{ type: 'Profile', id: userId }],
    }),
    
    // Update current user profile
    updateMyProfile: builder.mutation<ApiResponse<UserProfile>, UpdateProfileRequest>({
      query: (body) => ({
        url: '/api/users/profile',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Profile'],
    }),
    
    // Upload avatar
    uploadAvatar: builder.mutation<ApiResponse<{ avatarUrl: string }>, FormData>({
      query: (formData) => ({
        url: '/api/users/profile/avatar',
        method: 'POST',
        body: formData,
        formData: true,
      }),
      invalidatesTags: ['Profile'],
    }),
    
    // Delete avatar
    deleteAvatar: builder.mutation<ApiResponse, void>({
      query: () => ({
        url: '/api/users/profile/avatar',
        method: 'DELETE',
      }),
      invalidatesTags: ['Profile'],
    }),
    
    // Get user preferences
    getMyPreferences: builder.query<ApiResponse<UserPreferences>, void>({
      query: () => '/api/users/preferences',
      providesTags: ['Profile'],
    }),
    
    // Update user preferences
    updateMyPreferences: builder.mutation<ApiResponse<UserPreferences>, UpdatePreferencesRequest>({
      query: (body) => ({
        url: '/api/users/preferences',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Profile'],
    }),
    
    // Add experience entry
    addExperience: builder.mutation<ApiResponse<ExperienceEntry>, Omit<ExperienceEntry, 'id'>>({
      query: (body) => ({
        url: '/api/users/profile/experience',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Profile'],
    }),
    
    // Update experience entry
    updateExperience: builder.mutation<ApiResponse<ExperienceEntry>, { id: string; data: Partial<ExperienceEntry> }>({
      query: ({ id, data }) => ({
        url: `/api/users/profile/experience/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Profile'],
    }),
    
    // Delete experience entry
    deleteExperience: builder.mutation<ApiResponse, string>({
      query: (id) => ({
        url: `/api/users/profile/experience/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Profile'],
    }),
    
    // Add education entry
    addEducation: builder.mutation<ApiResponse<EducationEntry>, Omit<EducationEntry, 'id'>>({
      query: (body) => ({
        url: '/api/users/profile/education',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Profile'],
    }),
    
    // Update education entry
    updateEducation: builder.mutation<ApiResponse<EducationEntry>, { id: string; data: Partial<EducationEntry> }>({
      query: ({ id, data }) => ({
        url: `/api/users/profile/education/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Profile'],
    }),
    
    // Delete education entry
    deleteEducation: builder.mutation<ApiResponse, string>({
      query: (id) => ({
        url: `/api/users/profile/education/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Profile'],
    }),
    
    // Add certification entry
    addCertification: builder.mutation<ApiResponse<CertificationEntry>, Omit<CertificationEntry, 'id'>>({
      query: (body) => ({
        url: '/api/users/profile/certifications',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Profile'],
    }),
    
    // Update certification entry
    updateCertification: builder.mutation<ApiResponse<CertificationEntry>, { id: string; data: Partial<CertificationEntry> }>({
      query: ({ id, data }) => ({
        url: `/api/users/profile/certifications/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Profile'],
    }),
    
    // Delete certification entry
    deleteCertification: builder.mutation<ApiResponse, string>({
      query: (id) => ({
        url: `/api/users/profile/certifications/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Profile'],
    }),
    
    // Search users
    searchUsers: builder.query<PaginatedResponse<UserProfile>, SearchParams & { filters?: UserSearchFilters }>({
      query: ({ page = 1, limit = 20, search, sort, order, filters }) => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        
        if (search) params.append('search', search);
        if (sort) params.append('sort', sort);
        if (order) params.append('order', order);
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            if (Array.isArray(value)) {
              value.forEach(v => params.append(`filters[${key}]`, v));
            } else if (value) {
              params.append(`filters[${key}]`, value);
            }
          });
        }
        
        return `/api/users/search?${params.toString()}`;
      },
      providesTags: ['User'],
    }),
    
    // Get user recommendations
    getUserRecommendations: builder.query<ApiResponse<UserProfile[]>, { type: 'colleagues' | 'mentors' | 'mentees'; limit?: number }>({
      query: ({ type, limit = 10 }) => `/api/users/recommendations?type=${type}&limit=${limit}`,
      providesTags: ['User'],
    }),
    
    // Get user skills suggestions
    getSkillsSuggestions: builder.query<ApiResponse<string[]>, string>({
      query: (query) => `/api/users/skills/suggestions?q=${encodeURIComponent(query)}`,
    }),
    
    // Get user activity feed
    getActivityFeed: builder.query<PaginatedResponse<any>, { page?: number; limit?: number }>({
      query: ({ page = 1, limit = 20 }) => `/api/users/activity?page=${page}&limit=${limit}`,
    }),
  }),
});

// Export hooks
export const {
  useGetMyProfileQuery,
  useGetUserProfileQuery,
  useUpdateMyProfileMutation,
  useUploadAvatarMutation,
  useDeleteAvatarMutation,
  useGetMyPreferencesQuery,
  useUpdateMyPreferencesMutation,
  useAddExperienceMutation,
  useUpdateExperienceMutation,
  useDeleteExperienceMutation,
  useAddEducationMutation,
  useUpdateEducationMutation,
  useDeleteEducationMutation,
  useAddCertificationMutation,
  useUpdateCertificationMutation,
  useDeleteCertificationMutation,
  useSearchUsersQuery,
  useGetUserRecommendationsQuery,
  useGetSkillsSuggestionsQuery,
  useGetActivityFeedQuery,
} = userApi;