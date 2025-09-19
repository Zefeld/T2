import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UIState {
  // Theme
  theme: 'light' | 'dark' | 'system';
  isDarkMode: boolean;
  
  // Layout
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  headerHeight: number;
  footerHeight: number;
  
  // Navigation
  currentPage: string;
  breadcrumbs: Array<{ label: string; path: string }>;
  navigationHistory: string[];
  
  // Modals and Dialogs
  modals: Record<string, {
    isOpen: boolean;
    data?: any;
    options?: any;
  }>;
  
  // Loading states
  globalLoading: boolean;
  loadingStates: Record<string, boolean>;
  
  // Notifications and Alerts
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
    duration?: number;
    persistent?: boolean;
    actions?: Array<{
      label: string;
      action: string;
      variant?: 'primary' | 'secondary';
    }>;
    timestamp: number;
  }>;
  
  // Search
  searchQuery: string;
  searchResults: any[];
  searchLoading: boolean;
  searchFilters: Record<string, any>;
  
  // Filters and Sorting
  filters: Record<string, any>;
  sorting: Record<string, {
    field: string;
    direction: 'asc' | 'desc';
  }>;
  
  // Pagination
  pagination: Record<string, {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }>;
  
  // Form states
  formStates: Record<string, {
    isDirty: boolean;
    isSubmitting: boolean;
    errors: Record<string, string>;
    touched: Record<string, boolean>;
  }>;
  
  // Preferences
  preferences: {
    language: string;
    timezone: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    currency: string;
    numberFormat: string;
    compactMode: boolean;
    animationsEnabled: boolean;
    soundEnabled: boolean;
    autoSave: boolean;
    autoSaveInterval: number;
  };
  
  // Responsive
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  
  // Performance
  performanceMetrics: {
    pageLoadTime: number;
    renderTime: number;
    apiResponseTimes: Record<string, number>;
  };
  
  // Accessibility
  accessibility: {
    highContrast: boolean;
    reducedMotion: boolean;
    screenReader: boolean;
    fontSize: 'small' | 'medium' | 'large' | 'extra-large';
    focusVisible: boolean;
  };
  
  // Feature flags
  featureFlags: Record<string, boolean>;
  
  // Error states
  errors: Array<{
    id: string;
    type: 'network' | 'validation' | 'permission' | 'system';
    message: string;
    details?: any;
    timestamp: number;
    resolved: boolean;
  }>;
}

const getInitialTheme = (): 'light' | 'dark' | 'system' => {
  const saved = localStorage.getItem('theme') as 'light' | 'dark' | 'system';
  return saved || 'system';
};

const getSystemDarkMode = (): boolean => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const getInitialBreakpoint = (): 'xs' | 'sm' | 'md' | 'lg' | 'xl' => {
  const width = window.innerWidth;
  if (width < 576) return 'xs';
  if (width < 768) return 'sm';
  if (width < 992) return 'md';
  if (width < 1200) return 'lg';
  return 'xl';
};

const initialState: UIState = {
  // Theme
  theme: getInitialTheme(),
  isDarkMode: getInitialTheme() === 'dark' || (getInitialTheme() === 'system' && getSystemDarkMode()),
  
  // Layout
  sidebarOpen: localStorage.getItem('sidebarOpen') !== 'false',
  sidebarCollapsed: localStorage.getItem('sidebarCollapsed') === 'true',
  headerHeight: 64,
  footerHeight: 48,
  
  // Navigation
  currentPage: window.location.pathname,
  breadcrumbs: [],
  navigationHistory: [],
  
  // Modals
  modals: {},
  
  // Loading
  globalLoading: false,
  loadingStates: {},
  
  // Notifications
  notifications: [],
  
  // Search
  searchQuery: '',
  searchResults: [],
  searchLoading: false,
  searchFilters: {},
  
  // Filters and Sorting
  filters: {},
  sorting: {},
  
  // Pagination
  pagination: {},
  
  // Forms
  formStates: {},
  
  // Preferences
  preferences: {
    language: localStorage.getItem('language') || 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateFormat: localStorage.getItem('dateFormat') || 'MM/dd/yyyy',
    timeFormat: (localStorage.getItem('timeFormat') as '12h' | '24h') || '12h',
    currency: localStorage.getItem('currency') || 'USD',
    numberFormat: localStorage.getItem('numberFormat') || 'en-US',
    compactMode: localStorage.getItem('compactMode') === 'true',
    animationsEnabled: localStorage.getItem('animationsEnabled') !== 'false',
    soundEnabled: localStorage.getItem('soundEnabled') === 'true',
    autoSave: localStorage.getItem('autoSave') !== 'false',
    autoSaveInterval: parseInt(localStorage.getItem('autoSaveInterval') || '30000'),
  },
  
  // Responsive
  breakpoint: getInitialBreakpoint(),
  isMobile: window.innerWidth < 768,
  isTablet: window.innerWidth >= 768 && window.innerWidth < 992,
  isDesktop: window.innerWidth >= 992,
  
  // Performance
  performanceMetrics: {
    pageLoadTime: 0,
    renderTime: 0,
    apiResponseTimes: {},
  },
  
  // Accessibility
  accessibility: {
    highContrast: localStorage.getItem('highContrast') === 'true',
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    screenReader: false,
    fontSize: (localStorage.getItem('fontSize') as any) || 'medium',
    focusVisible: true,
  },
  
  // Feature flags
  featureFlags: {},
  
  // Errors
  errors: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // Theme actions
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
      
      if (action.payload === 'system') {
        state.isDarkMode = getSystemDarkMode();
      } else {
        state.isDarkMode = action.payload === 'dark';
      }
      
      localStorage.setItem('theme', action.payload);
    },
    
    toggleTheme: (state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      state.theme = newTheme;
      state.isDarkMode = newTheme === 'dark';
      localStorage.setItem('theme', newTheme);
    },
    
    updateSystemTheme: (state, action: PayloadAction<boolean>) => {
      if (state.theme === 'system') {
        state.isDarkMode = action.payload;
      }
    },
    
    // Layout actions
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
      localStorage.setItem('sidebarOpen', state.sidebarOpen.toString());
    },
    
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
      localStorage.setItem('sidebarOpen', action.payload.toString());
    },
    
    toggleSidebarCollapsed: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      localStorage.setItem('sidebarCollapsed', state.sidebarCollapsed.toString());
    },
    
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
      localStorage.setItem('sidebarCollapsed', action.payload.toString());
    },
    
    // Navigation actions
    setCurrentPage: (state, action: PayloadAction<string>) => {
      if (state.currentPage !== action.payload) {
        state.navigationHistory.push(state.currentPage);
        // Keep only last 10 pages in history
        if (state.navigationHistory.length > 10) {
          state.navigationHistory.shift();
        }
      }
      state.currentPage = action.payload;
    },
    
    setBreadcrumbs: (state, action: PayloadAction<Array<{ label: string; path: string }>>) => {
      state.breadcrumbs = action.payload;
    },
    
    // Modal actions
    openModal: (state, action: PayloadAction<{
      id: string;
      data?: any;
      options?: any;
    }>) => {
      const { id, data, options } = action.payload;
      state.modals[id] = { isOpen: true, data, options };
    },
    
    closeModal: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (state.modals[id]) {
        state.modals[id].isOpen = false;
      }
    },
    
    closeAllModals: (state) => {
      Object.keys(state.modals).forEach(id => {
        state.modals[id].isOpen = false;
      });
    },
    
    // Loading actions
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.globalLoading = action.payload;
    },
    
    setLoading: (state, action: PayloadAction<{ key: string; loading: boolean }>) => {
      const { key, loading } = action.payload;
      state.loadingStates[key] = loading;
    },
    
    // Notification actions
    addNotification: (state, action: PayloadAction<Omit<UIState['notifications'][0], 'id' | 'timestamp'>>) => {
      const notification = {
        ...action.payload,
        id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      };
      state.notifications.push(notification);
    },
    
    removeNotification: (state, action: PayloadAction<string>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload);
    },
    
    clearNotifications: (state) => {
      state.notifications = [];
    },
    
    // Search actions
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    
    setSearchResults: (state, action: PayloadAction<any[]>) => {
      state.searchResults = action.payload;
    },
    
    setSearchLoading: (state, action: PayloadAction<boolean>) => {
      state.searchLoading = action.payload;
    },
    
    setSearchFilters: (state, action: PayloadAction<Record<string, any>>) => {
      state.searchFilters = action.payload;
    },
    
    // Filter and sorting actions
    setFilters: (state, action: PayloadAction<{ key: string; filters: Record<string, any> }>) => {
      const { key, filters } = action.payload;
      state.filters[key] = filters;
    },
    
    setSorting: (state, action: PayloadAction<{
      key: string;
      field: string;
      direction: 'asc' | 'desc';
    }>) => {
      const { key, field, direction } = action.payload;
      state.sorting[key] = { field, direction };
    },
    
    // Pagination actions
    setPagination: (state, action: PayloadAction<{
      key: string;
      page: number;
      limit: number;
      total: number;
    }>) => {
      const { key, page, limit, total } = action.payload;
      state.pagination[key] = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      };
    },
    
    // Form actions
    setFormState: (state, action: PayloadAction<{
      formId: string;
      isDirty?: boolean;
      isSubmitting?: boolean;
      errors?: Record<string, string>;
      touched?: Record<string, boolean>;
    }>) => {
      const { formId, ...formState } = action.payload;
      state.formStates[formId] = {
        ...state.formStates[formId],
        ...formState,
      };
    },
    
    resetFormState: (state, action: PayloadAction<string>) => {
      delete state.formStates[action.payload];
    },
    
    // Preferences actions
    setPreference: (state, action: PayloadAction<{
      key: keyof UIState['preferences'];
      value: any;
    }>) => {
      const { key, value } = action.payload;
      state.preferences[key] = value;
      localStorage.setItem(key, value.toString());
    },
    
    setPreferences: (state, action: PayloadAction<Partial<UIState['preferences']>>) => {
      Object.entries(action.payload).forEach(([key, value]) => {
        if (value !== undefined) {
          (state.preferences as any)[key] = value;
          localStorage.setItem(key, value.toString());
        }
      });
    },
    
    // Responsive actions
    setBreakpoint: (state, action: PayloadAction<'xs' | 'sm' | 'md' | 'lg' | 'xl'>) => {
      state.breakpoint = action.payload;
      state.isMobile = ['xs', 'sm'].includes(action.payload);
      state.isTablet = action.payload === 'md';
      state.isDesktop = ['lg', 'xl'].includes(action.payload);
    },
    
    // Performance actions
    setPerformanceMetric: (state, action: PayloadAction<{
      key: keyof UIState['performanceMetrics'];
      value: number;
    }>) => {
      const { key, value } = action.payload;
      if (key === 'apiResponseTimes') return; // Handle separately
      (state.performanceMetrics as any)[key] = value;
    },
    
    setApiResponseTime: (state, action: PayloadAction<{ endpoint: string; time: number }>) => {
      const { endpoint, time } = action.payload;
      state.performanceMetrics.apiResponseTimes[endpoint] = time;
    },
    
    // Accessibility actions
    setAccessibilityOption: (state, action: PayloadAction<{
      key: keyof UIState['accessibility'];
      value: any;
    }>) => {
      const { key, value } = action.payload;
      state.accessibility[key] = value;
      localStorage.setItem(key, value.toString());
    },
    
    // Feature flags actions
    setFeatureFlag: (state, action: PayloadAction<{ key: string; enabled: boolean }>) => {
      const { key, enabled } = action.payload;
      state.featureFlags[key] = enabled;
    },
    
    setFeatureFlags: (state, action: PayloadAction<Record<string, boolean>>) => {
      state.featureFlags = { ...state.featureFlags, ...action.payload };
    },
    
    // Error actions
    addError: (state, action: PayloadAction<Omit<UIState['errors'][0], 'id' | 'timestamp' | 'resolved'>>) => {
      const error = {
        ...action.payload,
        id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        resolved: false,
      };
      state.errors.push(error);
    },
    
    resolveError: (state, action: PayloadAction<string>) => {
      const error = state.errors.find(e => e.id === action.payload);
      if (error) {
        error.resolved = true;
      }
    },
    
    removeError: (state, action: PayloadAction<string>) => {
      state.errors = state.errors.filter(e => e.id !== action.payload);
    },
    
    clearErrors: (state) => {
      state.errors = [];
    },
  },
});

export const {
  setTheme,
  toggleTheme,
  updateSystemTheme,
  toggleSidebar,
  setSidebarOpen,
  toggleSidebarCollapsed,
  setSidebarCollapsed,
  setCurrentPage,
  setBreadcrumbs,
  openModal,
  closeModal,
  closeAllModals,
  setGlobalLoading,
  setLoading,
  addNotification,
  removeNotification,
  clearNotifications,
  setSearchQuery,
  setSearchResults,
  setSearchLoading,
  setSearchFilters,
  setFilters,
  setSorting,
  setPagination,
  setFormState,
  resetFormState,
  setPreference,
  setPreferences,
  setBreakpoint,
  setPerformanceMetric,
  setApiResponseTime,
  setAccessibilityOption,
  setFeatureFlag,
  setFeatureFlags,
  addError,
  resolveError,
  removeError,
  clearErrors,
} = uiSlice.actions;

// Selectors
export const selectUI = (state: { ui: UIState }) => state.ui;
export const selectTheme = (state: { ui: UIState }) => state.ui.theme;
export const selectIsDarkMode = (state: { ui: UIState }) => state.ui.isDarkMode;
export const selectSidebarOpen = (state: { ui: UIState }) => state.ui.sidebarOpen;
export const selectSidebarCollapsed = (state: { ui: UIState }) => state.ui.sidebarCollapsed;
export const selectCurrentPage = (state: { ui: UIState }) => state.ui.currentPage;
export const selectBreadcrumbs = (state: { ui: UIState }) => state.ui.breadcrumbs;
export const selectModals = (state: { ui: UIState }) => state.ui.modals;
export const selectGlobalLoading = (state: { ui: UIState }) => state.ui.globalLoading;
export const selectNotifications = (state: { ui: UIState }) => state.ui.notifications;
export const selectPreferences = (state: { ui: UIState }) => state.ui.preferences;
export const selectBreakpoint = (state: { ui: UIState }) => state.ui.breakpoint;
export const selectIsMobile = (state: { ui: UIState }) => state.ui.isMobile;
export const selectIsTablet = (state: { ui: UIState }) => state.ui.isTablet;
export const selectIsDesktop = (state: { ui: UIState }) => state.ui.isDesktop;
export const selectAccessibility = (state: { ui: UIState }) => state.ui.accessibility;
export const selectFeatureFlags = (state: { ui: UIState }) => state.ui.featureFlags;
export const selectErrors = (state: { ui: UIState }) => state.ui.errors;

// Helper selectors
export const selectModalById = (id: string) => (state: { ui: UIState }) => 
  state.ui.modals[id];

export const selectLoadingState = (key: string) => (state: { ui: UIState }) => 
  state.ui.loadingStates[key] || false;

export const selectFilters = (key: string) => (state: { ui: UIState }) => 
  state.ui.filters[key] || {};

export const selectSorting = (key: string) => (state: { ui: UIState }) => 
  state.ui.sorting[key];

export const selectPagination = (key: string) => (state: { ui: UIState }) => 
  state.ui.pagination[key];

export const selectFormState = (formId: string) => (state: { ui: UIState }) => 
  state.ui.formStates[formId];

export const selectFeatureFlag = (key: string) => (state: { ui: UIState }) => 
  state.ui.featureFlags[key] || false;

export const selectUnresolvedErrors = (state: { ui: UIState }) => 
  state.ui.errors.filter(e => !e.resolved);

export default uiSlice.reducer;