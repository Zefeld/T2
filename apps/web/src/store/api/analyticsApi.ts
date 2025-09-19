import { createApi } from '@reduxjs/toolkit/query/react';
import { baseApi, ApiResponse, PaginatedResponse } from './baseApi';

// Types
export interface AnalyticsMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  period: string;
  category: 'performance' | 'engagement' | 'productivity' | 'satisfaction' | 'retention';
  description?: string;
  target?: number;
  benchmark?: number;
}

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'heatmap' | 'gauge';
  title: string;
  description?: string;
  position: { x: number; y: number; width: number; height: number };
  config: Record<string, any>;
  dataSource: string;
  refreshInterval?: number;
  isVisible: boolean;
}

export interface AnalyticsReport {
  id: string;
  name: string;
  description?: string;
  type: 'performance' | 'engagement' | 'diversity' | 'retention' | 'custom';
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    dayOfWeek?: number;
    dayOfMonth?: number;
    time: string;
  };
  recipients: string[];
  filters: Record<string, any>;
  metrics: string[];
  visualizations: Array<{
    type: 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap';
    config: Record<string, any>;
  }>;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  lastGenerated?: string;
}

export interface PerformanceMetrics {
  overall: {
    averageRating: number;
    totalReviews: number;
    improvementRate: number;
    goalCompletionRate: number;
  };
  byDepartment: Array<{
    department: string;
    averageRating: number;
    employeeCount: number;
    topPerformers: number;
    improvementNeeded: number;
  }>;
  byRole: Array<{
    role: string;
    averageRating: number;
    employeeCount: number;
    skillGaps: string[];
  }>;
  trends: Array<{
    period: string;
    averageRating: number;
    reviewCount: number;
  }>;
}

export interface EngagementMetrics {
  overall: {
    engagementScore: number;
    participationRate: number;
    satisfactionScore: number;
    npsScore: number;
  };
  byDemographic: Array<{
    category: string;
    value: string;
    engagementScore: number;
    employeeCount: number;
  }>;
  drivers: Array<{
    factor: string;
    impact: number;
    currentScore: number;
    benchmark: number;
  }>;
  trends: Array<{
    period: string;
    engagementScore: number;
    participationRate: number;
  }>;
}

export interface RetentionMetrics {
  overall: {
    retentionRate: number;
    turnoverRate: number;
    averageTenure: number;
    voluntaryTurnover: number;
  };
  byDepartment: Array<{
    department: string;
    retentionRate: number;
    turnoverRate: number;
    averageTenure: number;
    riskEmployees: number;
  }>;
  exitReasons: Array<{
    reason: string;
    percentage: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }>;
  predictions: Array<{
    employeeId: string;
    riskScore: number;
    factors: string[];
    recommendedActions: string[];
  }>;
}

export interface DiversityMetrics {
  overall: {
    diversityIndex: number;
    inclusionScore: number;
    payEquityScore: number;
    representationScore: number;
  };
  demographics: Array<{
    category: 'gender' | 'age' | 'ethnicity' | 'education' | 'experience';
    breakdown: Array<{
      value: string;
      count: number;
      percentage: number;
    }>;
  }>;
  leadership: Array<{
    level: string;
    demographics: Record<string, number>;
    diversityScore: number;
  }>;
  payGaps: Array<{
    category: string;
    gap: number;
    adjustedGap: number;
    significance: 'significant' | 'moderate' | 'minimal';
  }>;
}

export interface ProductivityMetrics {
  overall: {
    productivityIndex: number;
    efficiencyScore: number;
    utilizationRate: number;
    outputPerEmployee: number;
  };
  byTeam: Array<{
    teamId: string;
    teamName: string;
    productivityScore: number;
    efficiency: number;
    memberCount: number;
  }>;
  trends: Array<{
    period: string;
    productivityIndex: number;
    efficiency: number;
    factors: string[];
  }>;
  benchmarks: Array<{
    metric: string;
    currentValue: number;
    industryBenchmark: number;
    percentile: number;
  }>;
}

// Analytics API
export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Dashboard
    getDashboardMetrics: builder.query<ApiResponse<AnalyticsMetric[]>, {
      category?: string;
      period?: string;
      department?: string;
    }>({
      query: ({ category, period, department } = {}) => {
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (period) params.append('period', period);
        if (department) params.append('department', department);
        
        return `/api/analytics/dashboard/metrics?${params.toString()}`;
      },
      providesTags: ['Analytics'],
    }),
    
    getDashboardWidgets: builder.query<ApiResponse<DashboardWidget[]>, void>({
      query: () => '/api/analytics/dashboard/widgets',
      providesTags: ['DashboardWidget'],
    }),
    
    updateDashboardWidget: builder.mutation<ApiResponse<DashboardWidget>, {
      widgetId: string;
    } & Partial<DashboardWidget>>({
      query: ({ widgetId, ...body }) => ({
        url: `/api/analytics/dashboard/widgets/${widgetId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['DashboardWidget'],
    }),
    
    // Performance Analytics
    getPerformanceMetrics: builder.query<ApiResponse<PerformanceMetrics>, {
      period?: string;
      department?: string;
      role?: string;
    }>({
      query: ({ period, department, role } = {}) => {
        const params = new URLSearchParams();
        if (period) params.append('period', period);
        if (department) params.append('department', department);
        if (role) params.append('role', role);
        
        return `/api/analytics/performance?${params.toString()}`;
      },
      providesTags: ['Analytics'],
    }),
    
    // Engagement Analytics
    getEngagementMetrics: builder.query<ApiResponse<EngagementMetrics>, {
      period?: string;
      demographic?: string;
    }>({
      query: ({ period, demographic } = {}) => {
        const params = new URLSearchParams();
        if (period) params.append('period', period);
        if (demographic) params.append('demographic', demographic);
        
        return `/api/analytics/engagement?${params.toString()}`;
      },
      providesTags: ['Analytics'],
    }),
    
    // Retention Analytics
    getRetentionMetrics: builder.query<ApiResponse<RetentionMetrics>, {
      period?: string;
      department?: string;
      includePredicitions?: boolean;
    }>({
      query: ({ period, department, includePredicitions } = {}) => {
        const params = new URLSearchParams();
        if (period) params.append('period', period);
        if (department) params.append('department', department);
        if (includePredicitions) params.append('includePredictions', 'true');
        
        return `/api/analytics/retention?${params.toString()}`;
      },
      providesTags: ['Analytics'],
    }),
    
    // Diversity Analytics
    getDiversityMetrics: builder.query<ApiResponse<DiversityMetrics>, {
      includePayGaps?: boolean;
      level?: string;
    }>({
      query: ({ includePayGaps, level } = {}) => {
        const params = new URLSearchParams();
        if (includePayGaps) params.append('includePayGaps', 'true');
        if (level) params.append('level', level);
        
        return `/api/analytics/diversity?${params.toString()}`;
      },
      providesTags: ['Analytics'],
    }),
    
    // Productivity Analytics
    getProductivityMetrics: builder.query<ApiResponse<ProductivityMetrics>, {
      period?: string;
      teamId?: string;
      includeBenchmarks?: boolean;
    }>({
      query: ({ period, teamId, includeBenchmarks } = {}) => {
        const params = new URLSearchParams();
        if (period) params.append('period', period);
        if (teamId) params.append('teamId', teamId);
        if (includeBenchmarks) params.append('includeBenchmarks', 'true');
        
        return `/api/analytics/productivity?${params.toString()}`;
      },
      providesTags: ['Analytics'],
    }),
    
    // Reports
    getReports: builder.query<ApiResponse<AnalyticsReport[]>, {
      type?: string;
      isActive?: boolean;
    }>({
      query: ({ type, isActive } = {}) => {
        const params = new URLSearchParams();
        if (type) params.append('type', type);
        if (isActive !== undefined) params.append('isActive', isActive.toString());
        
        return `/api/analytics/reports?${params.toString()}`;
      },
      providesTags: ['AnalyticsReport'],
    }),
    
    createReport: builder.mutation<ApiResponse<AnalyticsReport>, Omit<AnalyticsReport, 'id' | 'createdBy' | 'createdAt' | 'lastGenerated'>>({
      query: (body) => ({
        url: '/api/analytics/reports',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AnalyticsReport'],
    }),
    
    updateReport: builder.mutation<ApiResponse<AnalyticsReport>, {
      reportId: string;
    } & Partial<AnalyticsReport>>({
      query: ({ reportId, ...body }) => ({
        url: `/api/analytics/reports/${reportId}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['AnalyticsReport'],
    }),
    
    deleteReport: builder.mutation<ApiResponse, string>({
      query: (reportId) => ({
        url: `/api/analytics/reports/${reportId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['AnalyticsReport'],
    }),
    
    generateReport: builder.mutation<ApiResponse<{ reportUrl: string; expiresAt: string }>, {
      reportId: string;
      format?: 'pdf' | 'excel' | 'csv';
    }>({
      query: ({ reportId, format = 'pdf' }) => ({
        url: `/api/analytics/reports/${reportId}/generate`,
        method: 'POST',
        body: { format },
      }),
    }),
    
    // Custom Analytics
    runCustomQuery: builder.mutation<ApiResponse<{
      data: any[];
      columns: Array<{ name: string; type: string }>;
      totalRows: number;
    }>, {
      query: string;
      parameters?: Record<string, any>;
      limit?: number;
    }>({
      query: (body) => ({
        url: '/api/analytics/custom/query',
        method: 'POST',
        body,
      }),
    }),
    
    // Data Export
    exportData: builder.mutation<ApiResponse<{ downloadUrl: string; expiresAt: string }>, {
      type: 'performance' | 'engagement' | 'retention' | 'diversity' | 'productivity';
      format: 'csv' | 'excel' | 'json';
      filters?: Record<string, any>;
      dateRange?: { start: string; end: string };
    }>({
      query: (body) => ({
        url: '/api/analytics/export',
        method: 'POST',
        body,
      }),
    }),
    
    // Benchmarking
    getBenchmarks: builder.query<ApiResponse<Array<{
      metric: string;
      category: string;
      industryAverage: number;
      topQuartile: number;
      ourValue: number;
      percentile: number;
      trend: 'improving' | 'declining' | 'stable';
    }>>, {
      industry?: string;
      companySize?: string;
      region?: string;
    }>({
      query: ({ industry, companySize, region } = {}) => {
        const params = new URLSearchParams();
        if (industry) params.append('industry', industry);
        if (companySize) params.append('companySize', companySize);
        if (region) params.append('region', region);
        
        return `/api/analytics/benchmarks?${params.toString()}`;
      },
    }),
    
    // Insights & Recommendations
    getInsights: builder.query<ApiResponse<Array<{
      id: string;
      type: 'opportunity' | 'risk' | 'trend' | 'anomaly';
      title: string;
      description: string;
      impact: 'high' | 'medium' | 'low';
      confidence: number;
      recommendations: string[];
      affectedMetrics: string[];
      createdAt: string;
    }>>, {
      type?: string;
      impact?: string;
      limit?: number;
    }>({
      query: ({ type, impact, limit = 10 } = {}) => {
        const params = new URLSearchParams({ limit: limit.toString() });
        if (type) params.append('type', type);
        if (impact) params.append('impact', impact);
        
        return `/api/analytics/insights?${params.toString()}`;
      },
    }),
    
    // Real-time Analytics
    getRealtimeMetrics: builder.query<ApiResponse<{
      activeUsers: number;
      systemLoad: number;
      responseTime: number;
      errorRate: number;
      throughput: number;
      timestamp: string;
    }>, void>({
      query: () => '/api/analytics/realtime',
      // Refetch every 30 seconds for real-time data
      pollingInterval: 30000,
    }),
  }),
});

// Export hooks
export const {
  useGetDashboardMetricsQuery,
  useGetDashboardWidgetsQuery,
  useUpdateDashboardWidgetMutation,
  useGetPerformanceMetricsQuery,
  useGetEngagementMetricsQuery,
  useGetRetentionMetricsQuery,
  useGetDiversityMetricsQuery,
  useGetProductivityMetricsQuery,
  useGetReportsQuery,
  useCreateReportMutation,
  useUpdateReportMutation,
  useDeleteReportMutation,
  useGenerateReportMutation,
  useRunCustomQueryMutation,
  useExportDataMutation,
  useGetBenchmarksQuery,
  useGetInsightsQuery,
  useGetRealtimeMetricsQuery,
} = analyticsApi;