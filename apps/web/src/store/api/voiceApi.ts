import { createApi } from '@reduxjs/toolkit/query/react';
import { baseApi, ApiResponse } from './baseApi';

// Types
export interface STTRequest {
  audioFile: File;
  language?: string;
  model?: string;
  enablePunctuation?: boolean;
  enableDiarization?: boolean;
  maxSpeakers?: number;
}

export interface STTResponse {
  text: string;
  confidence: number;
  language: string;
  duration: number;
  segments?: STTSegment[];
  speakers?: STTSpeaker[];
  processingTime: number;
}

export interface STTSegment {
  text: string;
  start: number;
  end: number;
  confidence: number;
  speaker?: string;
}

export interface STTSpeaker {
  id: string;
  name?: string;
  segments: number[];
}

export interface TTSRequest {
  text: string;
  voice?: string;
  language?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
  format?: 'wav' | 'mp3' | 'ogg';
  quality?: 'low' | 'medium' | 'high';
}

export interface TTSResponse {
  audioUrl: string;
  duration: number;
  format: string;
  size: number;
  processingTime: number;
}

export interface VoiceModel {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  description?: string;
  sampleUrl?: string;
  isDefault: boolean;
}

export interface STTModel {
  id: string;
  name: string;
  language: string;
  description?: string;
  accuracy: number;
  isDefault: boolean;
  supportsPunctuation: boolean;
  supportsDiarization: boolean;
}

export interface VoiceJob {
  id: string;
  type: 'stt' | 'tts';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
  input: any;
  output?: any;
}

// Voice API
export const voiceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Speech-to-Text
    speechToText: builder.mutation<ApiResponse<STTResponse>, STTRequest>({
      query: ({ audioFile, ...params }) => {
        const formData = new FormData();
        formData.append('audio', audioFile);
        
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            formData.append(key, value.toString());
          }
        });
        
        return {
          url: '/api/voice/stt',
          method: 'POST',
          body: formData,
          formData: true,
        };
      },
    }),
    
    // Text-to-Speech
    textToSpeech: builder.mutation<ApiResponse<TTSResponse>, TTSRequest>({
      query: (body) => ({
        url: '/api/voice/tts',
        method: 'POST',
        body,
      }),
    }),
    
    // Get available STT models
    getSTTModels: builder.query<ApiResponse<STTModel[]>, void>({
      query: () => '/api/voice/stt/models',
    }),
    
    // Get available TTS voices
    getTTSVoices: builder.query<ApiResponse<VoiceModel[]>, { language?: string }>({
      query: ({ language } = {}) => {
        const params = language ? `?language=${language}` : '';
        return `/api/voice/tts/voices${params}`;
      },
    }),
    
    // Get supported languages
    getSupportedLanguages: builder.query<ApiResponse<{ code: string; name: string; nativeName: string }[]>, void>({
      query: () => '/api/voice/languages',
    }),
    
    // Start async STT job
    startSTTJob: builder.mutation<ApiResponse<{ jobId: string }>, STTRequest>({
      query: ({ audioFile, ...params }) => {
        const formData = new FormData();
        formData.append('audio', audioFile);
        
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            formData.append(key, value.toString());
          }
        });
        
        return {
          url: '/api/voice/stt/async',
          method: 'POST',
          body: formData,
          formData: true,
        };
      },
    }),
    
    // Start async TTS job
    startTTSJob: builder.mutation<ApiResponse<{ jobId: string }>, TTSRequest>({
      query: (body) => ({
        url: '/api/voice/tts/async',
        method: 'POST',
        body,
      }),
    }),
    
    // Get job status
    getJobStatus: builder.query<ApiResponse<VoiceJob>, string>({
      query: (jobId) => `/api/voice/jobs/${jobId}`,
    }),
    
    // Get job result
    getJobResult: builder.query<ApiResponse<STTResponse | TTSResponse>, string>({
      query: (jobId) => `/api/voice/jobs/${jobId}/result`,
    }),
    
    // Cancel job
    cancelJob: builder.mutation<ApiResponse, string>({
      query: (jobId) => ({
        url: `/api/voice/jobs/${jobId}/cancel`,
        method: 'POST',
      }),
    }),
    
    // Get user's voice jobs
    getMyJobs: builder.query<ApiResponse<VoiceJob[]>, { page?: number; limit?: number; type?: 'stt' | 'tts' }>({
      query: ({ page = 1, limit = 20, type } = {}) => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        
        if (type) params.append('type', type);
        
        return `/api/voice/jobs?${params.toString()}`;
      },
    }),
    
    // Delete job
    deleteJob: builder.mutation<ApiResponse, string>({
      query: (jobId) => ({
        url: `/api/voice/jobs/${jobId}`,
        method: 'DELETE',
      }),
    }),
    
    // Get voice usage statistics
    getVoiceStats: builder.query<ApiResponse<{
      totalJobs: number;
      completedJobs: number;
      failedJobs: number;
      totalProcessingTime: number;
      totalAudioDuration: number;
      usageByType: { stt: number; tts: number };
      usageByMonth: Array<{ month: string; count: number; duration: number }>;
    }>, { period?: 'week' | 'month' | 'year' }>({
      query: ({ period = 'month' } = {}) => `/api/voice/stats?period=${period}`,
    }),
    
    // Test voice model
    testVoiceModel: builder.mutation<ApiResponse<TTSResponse>, { voiceId: string; text?: string }>({
      query: ({ voiceId, text = 'Hello, this is a test of the voice model.' }) => ({
        url: '/api/voice/tts/test',
        method: 'POST',
        body: { voiceId, text },
      }),
    }),
    
    // Get voice model details
    getVoiceModelDetails: builder.query<ApiResponse<VoiceModel & { 
      samples: string[];
      features: string[];
      limitations: string[];
    }>, string>({
      query: (voiceId) => `/api/voice/tts/voices/${voiceId}`,
    }),
    
    // Upload custom voice sample (for future voice cloning)
    uploadVoiceSample: builder.mutation<ApiResponse<{ sampleId: string }>, { 
      audioFile: File; 
      name: string; 
      description?: string 
    }>({
      query: ({ audioFile, name, description }) => {
        const formData = new FormData();
        formData.append('audio', audioFile);
        formData.append('name', name);
        if (description) formData.append('description', description);
        
        return {
          url: '/api/voice/samples',
          method: 'POST',
          body: formData,
          formData: true,
        };
      },
    }),
    
    // Get user's voice samples
    getMyVoiceSamples: builder.query<ApiResponse<Array<{
      id: string;
      name: string;
      description?: string;
      duration: number;
      createdAt: string;
      audioUrl: string;
    }>>, void>({
      query: () => '/api/voice/samples',
    }),
  }),
});

// Export hooks
export const {
  useSpeechToTextMutation,
  useTextToSpeechMutation,
  useGetSTTModelsQuery,
  useGetTTSVoicesQuery,
  useGetSupportedLanguagesQuery,
  useStartSTTJobMutation,
  useStartTTSJobMutation,
  useGetJobStatusQuery,
  useGetJobResultQuery,
  useCancelJobMutation,
  useGetMyJobsQuery,
  useDeleteJobMutation,
  useGetVoiceStatsQuery,
  useTestVoiceModelMutation,
  useGetVoiceModelDetailsQuery,
  useUploadVoiceSampleMutation,
  useGetMyVoiceSamplesQuery,
} = voiceApi;