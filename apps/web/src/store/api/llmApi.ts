import { createApi } from '@reduxjs/toolkit/query/react';
import { baseApi, ApiResponse } from './baseApi';

// Types
export interface LLMRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stream?: boolean;
  systemPrompt?: string;
  context?: string;
  tools?: LLMTool[];
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

export interface LLMResponse {
  id: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter';
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  created: number;
  processingTime: number;
}

export interface LLMModel {
  id: string;
  name: string;
  description: string;
  provider: 'scibox' | 'openai' | 'anthropic' | 'local';
  contextLength: number;
  maxOutputTokens: number;
  inputPricePerToken: number;
  outputPricePerToken: number;
  capabilities: string[];
  isDefault: boolean;
  isAvailable: boolean;
}

export interface ConversationThread {
  id: string;
  title: string;
  messages: ChatMessage[];
  model: string;
  createdAt: string;
  updatedAt: string;
  totalTokens: number;
  totalCost: number;
  tags: string[];
  isArchived: boolean;
}

export interface LLMUsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageResponseTime: number;
  usageByModel: Record<string, {
    requests: number;
    tokens: number;
    cost: number;
  }>;
  usageByDay: Array<{
    date: string;
    requests: number;
    tokens: number;
    cost: number;
  }>;
  topModels: Array<{
    model: string;
    usage: number;
    percentage: number;
  }>;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean';
    description: string;
    required: boolean;
    defaultValue?: any;
  }>;
  category: string;
  tags: string[];
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  usageCount: number;
}

// LLM API
export const llmApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Chat completion
    chatCompletion: builder.mutation<ApiResponse<LLMResponse>, LLMRequest>({
      query: (body) => ({
        url: '/api/llm/chat/completions',
        method: 'POST',
        body,
      }),
    }),
    
    // Stream chat completion
    streamChatCompletion: builder.mutation<ReadableStream, LLMRequest>({
      queryFn: async (body) => {
        try {
          const response = await fetch('/api/llm/chat/completions/stream', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            },
            body: JSON.stringify({ ...body, stream: true }),
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          return { data: response.body };
        } catch (error) {
          return { error: { status: 'FETCH_ERROR', error: error.message } };
        }
      },
    }),
    
    // Get available models
    getModels: builder.query<ApiResponse<LLMModel[]>, { provider?: string }>({
      query: ({ provider } = {}) => {
        const params = provider ? `?provider=${provider}` : '';
        return `/api/llm/models${params}`;
      },
    }),
    
    // Get model details
    getModelDetails: builder.query<ApiResponse<LLMModel & {
      benchmarks: Record<string, number>;
      limitations: string[];
      examples: Array<{
        input: string;
        output: string;
        description: string;
      }>;
    }>, string>({
      query: (modelId) => `/api/llm/models/${modelId}`,
    }),
    
    // Create conversation thread
    createThread: builder.mutation<ApiResponse<ConversationThread>, {
      title?: string;
      model: string;
      initialMessage?: ChatMessage;
    }>({
      query: (body) => ({
        url: '/api/llm/threads',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Thread'],
    }),
    
    // Get conversation threads
    getThreads: builder.query<ApiResponse<ConversationThread[]>, {
      page?: number;
      limit?: number;
      search?: string;
      tags?: string[];
      archived?: boolean;
    }>({
      query: ({ page = 1, limit = 20, search, tags, archived } = {}) => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        
        if (search) params.append('search', search);
        if (tags?.length) params.append('tags', tags.join(','));
        if (archived !== undefined) params.append('archived', archived.toString());
        
        return `/api/llm/threads?${params.toString()}`;
      },
      providesTags: ['Thread'],
    }),
    
    // Get thread by ID
    getThread: builder.query<ApiResponse<ConversationThread>, string>({
      query: (threadId) => `/api/llm/threads/${threadId}`,
      providesTags: (result, error, threadId) => [{ type: 'Thread', id: threadId }],
    }),
    
    // Update thread
    updateThread: builder.mutation<ApiResponse<ConversationThread>, {
      threadId: string;
      title?: string;
      tags?: string[];
      isArchived?: boolean;
    }>({
      query: ({ threadId, ...body }) => ({
        url: `/api/llm/threads/${threadId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (result, error, { threadId }) => [
        { type: 'Thread', id: threadId },
        'Thread',
      ],
    }),
    
    // Delete thread
    deleteThread: builder.mutation<ApiResponse, string>({
      query: (threadId) => ({
        url: `/api/llm/threads/${threadId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Thread'],
    }),
    
    // Add message to thread
    addMessageToThread: builder.mutation<ApiResponse<ConversationThread>, {
      threadId: string;
      message: ChatMessage;
    }>({
      query: ({ threadId, message }) => ({
        url: `/api/llm/threads/${threadId}/messages`,
        method: 'POST',
        body: { message },
      }),
      invalidatesTags: (result, error, { threadId }) => [
        { type: 'Thread', id: threadId },
      ],
    }),
    
    // Get usage statistics
    getUsageStats: builder.query<ApiResponse<LLMUsageStats>, {
      period?: 'day' | 'week' | 'month' | 'year';
      startDate?: string;
      endDate?: string;
    }>({
      query: ({ period = 'month', startDate, endDate } = {}) => {
        const params = new URLSearchParams({ period });
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        return `/api/llm/usage/stats?${params.toString()}`;
      },
    }),
    
    // Get prompt templates
    getPromptTemplates: builder.query<ApiResponse<PromptTemplate[]>, {
      category?: string;
      search?: string;
      tags?: string[];
      isPublic?: boolean;
    }>({
      query: ({ category, search, tags, isPublic } = {}) => {
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (search) params.append('search', search);
        if (tags?.length) params.append('tags', tags.join(','));
        if (isPublic !== undefined) params.append('isPublic', isPublic.toString());
        
        return `/api/llm/prompts?${params.toString()}`;
      },
      providesTags: ['PromptTemplate'],
    }),
    
    // Create prompt template
    createPromptTemplate: builder.mutation<ApiResponse<PromptTemplate>, Omit<PromptTemplate, 'id' | 'createdBy' | 'createdAt' | 'usageCount'>>({
      query: (body) => ({
        url: '/api/llm/prompts',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['PromptTemplate'],
    }),
    
    // Update prompt template
    updatePromptTemplate: builder.mutation<ApiResponse<PromptTemplate>, {
      templateId: string;
    } & Partial<PromptTemplate>>({
      query: ({ templateId, ...body }) => ({
        url: `/api/llm/prompts/${templateId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['PromptTemplate'],
    }),
    
    // Delete prompt template
    deletePromptTemplate: builder.mutation<ApiResponse, string>({
      query: (templateId) => ({
        url: `/api/llm/prompts/${templateId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['PromptTemplate'],
    }),
    
    // Render prompt template
    renderPromptTemplate: builder.mutation<ApiResponse<{ renderedPrompt: string }>, {
      templateId: string;
      variables: Record<string, any>;
    }>({
      query: ({ templateId, variables }) => ({
        url: `/api/llm/prompts/${templateId}/render`,
        method: 'POST',
        body: { variables },
      }),
    }),
    
    // Analyze text
    analyzeText: builder.mutation<ApiResponse<{
      sentiment: { score: number; label: 'positive' | 'negative' | 'neutral' };
      topics: Array<{ topic: string; confidence: number }>;
      entities: Array<{ text: string; type: string; confidence: number }>;
      summary: string;
      keyPhrases: string[];
      language: string;
      readabilityScore: number;
    }>, { text: string; analyses?: string[] }>({
      query: (body) => ({
        url: '/api/llm/analyze',
        method: 'POST',
        body,
      }),
    }),
    
    // Translate text
    translateText: builder.mutation<ApiResponse<{
      translatedText: string;
      sourceLanguage: string;
      targetLanguage: string;
      confidence: number;
    }>, {
      text: string;
      targetLanguage: string;
      sourceLanguage?: string;
    }>({
      query: (body) => ({
        url: '/api/llm/translate',
        method: 'POST',
        body,
      }),
    }),
    
    // Summarize text
    summarizeText: builder.mutation<ApiResponse<{
      summary: string;
      keyPoints: string[];
      originalLength: number;
      summaryLength: number;
      compressionRatio: number;
    }>, {
      text: string;
      maxLength?: number;
      style?: 'bullet' | 'paragraph' | 'abstract';
    }>({
      query: (body) => ({
        url: '/api/llm/summarize',
        method: 'POST',
        body,
      }),
    }),
  }),
});

// Export hooks
export const {
  useChatCompletionMutation,
  useStreamChatCompletionMutation,
  useGetModelsQuery,
  useGetModelDetailsQuery,
  useCreateThreadMutation,
  useGetThreadsQuery,
  useGetThreadQuery,
  useUpdateThreadMutation,
  useDeleteThreadMutation,
  useAddMessageToThreadMutation,
  useGetUsageStatsQuery,
  useGetPromptTemplatesQuery,
  useCreatePromptTemplateMutation,
  useUpdatePromptTemplateMutation,
  useDeletePromptTemplateMutation,
  useRenderPromptTemplateMutation,
  useAnalyzeTextMutation,
  useTranslateTextMutation,
  useSummarizeTextMutation,
} = llmApi;