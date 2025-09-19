import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'system';
  category: 'general' | 'security' | 'task' | 'social' | 'system' | 'gamification';
  title: string;
  message: string;
  description?: string;
  icon?: string;
  avatar?: string;
  timestamp: number;
  read: boolean;
  archived: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  persistent: boolean;
  autoHide: boolean;
  duration?: number;
  actions?: Array<{
    id: string;
    label: string;
    action: string;
    variant: 'primary' | 'secondary' | 'danger';
    icon?: string;
  }>;
  metadata?: Record<string, any>;
  source?: {
    type: 'user' | 'system' | 'api' | 'websocket';
    id?: string;
    name?: string;
  };
  relatedEntity?: {
    type: string;
    id: string;
    name?: string;
  };
  channels: Array<'in_app' | 'email' | 'push' | 'sms'>;
  deliveryStatus: Record<string, 'pending' | 'sent' | 'delivered' | 'failed'>;
}

export interface NotificationSettings {
  enabled: boolean;
  channels: {
    inApp: boolean;
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  categories: Record<string, {
    enabled: boolean;
    channels: Array<'in_app' | 'email' | 'push' | 'sms'>;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    autoHide: boolean;
    duration?: number;
  }>;
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;   // HH:mm format
    timezone: string;
    days: number[]; // 0-6, Sunday = 0
  };
  frequency: {
    digest: 'never' | 'daily' | 'weekly';
    digestTime: string; // HH:mm format
    maxPerHour: number;
    maxPerDay: number;
  };
  sound: {
    enabled: boolean;
    volume: number; // 0-100
    customSounds: Record<string, string>;
  };
}

export interface NotificationsState {
  notifications: Notification[];
  settings: NotificationSettings;
  unreadCount: number;
  totalCount: number;
  lastFetch: number | null;
  isLoading: boolean;
  error: string | null;
  
  // Filters and sorting
  filters: {
    type?: string[];
    category?: string[];
    priority?: string[];
    read?: boolean;
    archived?: boolean;
    dateRange?: {
      start: string;
      end: string;
    };
  };
  sorting: {
    field: 'timestamp' | 'priority' | 'type' | 'category';
    direction: 'asc' | 'desc';
  };
  
  // Pagination
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  
  // Real-time
  websocketConnected: boolean;
  lastHeartbeat: number | null;
  
  // UI state
  panelOpen: boolean;
  selectedNotification: string | null;
  bulkSelection: string[];
  
  // Statistics
  stats: {
    totalReceived: number;
    totalRead: number;
    totalArchived: number;
    averageReadTime: number;
    categoryBreakdown: Record<string, number>;
    typeBreakdown: Record<string, number>;
    priorityBreakdown: Record<string, number>;
  };
}

const defaultSettings: NotificationSettings = {
  enabled: true,
  channels: {
    inApp: true,
    email: true,
    push: false,
    sms: false,
  },
  categories: {
    general: {
      enabled: true,
      channels: ['in_app', 'email'],
      priority: 'medium',
      autoHide: true,
      duration: 5000,
    },
    security: {
      enabled: true,
      channels: ['in_app', 'email', 'push'],
      priority: 'high',
      autoHide: false,
    },
    task: {
      enabled: true,
      channels: ['in_app'],
      priority: 'medium',
      autoHide: true,
      duration: 4000,
    },
    social: {
      enabled: true,
      channels: ['in_app'],
      priority: 'low',
      autoHide: true,
      duration: 3000,
    },
    system: {
      enabled: true,
      channels: ['in_app', 'email'],
      priority: 'high',
      autoHide: false,
    },
    gamification: {
      enabled: true,
      channels: ['in_app'],
      priority: 'low',
      autoHide: true,
      duration: 6000,
    },
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    days: [0, 1, 2, 3, 4, 5, 6],
  },
  frequency: {
    digest: 'never',
    digestTime: '09:00',
    maxPerHour: 10,
    maxPerDay: 50,
  },
  sound: {
    enabled: true,
    volume: 50,
    customSounds: {},
  },
};

const initialState: NotificationsState = {
  notifications: [],
  settings: defaultSettings,
  unreadCount: 0,
  totalCount: 0,
  lastFetch: null,
  isLoading: false,
  error: null,
  
  filters: {},
  sorting: {
    field: 'timestamp',
    direction: 'desc',
  },
  
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false,
  },
  
  websocketConnected: false,
  lastHeartbeat: null,
  
  panelOpen: false,
  selectedNotification: null,
  bulkSelection: [],
  
  stats: {
    totalReceived: 0,
    totalRead: 0,
    totalArchived: 0,
    averageReadTime: 0,
    categoryBreakdown: {},
    typeBreakdown: {},
    priorityBreakdown: {},
  },
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // Notification CRUD
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'timestamp' | 'read' | 'archived'>>) => {
      const notification: Notification = {
        ...action.payload,
        id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        read: false,
        archived: false,
      };
      
      state.notifications.unshift(notification);
      state.unreadCount += 1;
      state.totalCount += 1;
      state.stats.totalReceived += 1;
      
      // Update category breakdown
      state.stats.categoryBreakdown[notification.category] = 
        (state.stats.categoryBreakdown[notification.category] || 0) + 1;
      
      // Update type breakdown
      state.stats.typeBreakdown[notification.type] = 
        (state.stats.typeBreakdown[notification.type] || 0) + 1;
      
      // Update priority breakdown
      state.stats.priorityBreakdown[notification.priority] = 
        (state.stats.priorityBreakdown[notification.priority] || 0) + 1;
    },
    
    setNotifications: (state, action: PayloadAction<{
      notifications: Notification[];
      total: number;
      hasMore: boolean;
      append?: boolean;
    }>) => {
      const { notifications, total, hasMore, append = false } = action.payload;
      
      if (append) {
        state.notifications.push(...notifications);
      } else {
        state.notifications = notifications;
      }
      
      state.totalCount = total;
      state.pagination.total = total;
      state.pagination.hasMore = hasMore;
      state.unreadCount = notifications.filter(n => !n.read).length;
      state.lastFetch = Date.now();
    },
    
    updateNotification: (state, action: PayloadAction<{
      id: string;
      updates: Partial<Notification>;
    }>) => {
      const { id, updates } = action.payload;
      const notification = state.notifications.find(n => n.id === id);
      
      if (notification) {
        const wasRead = notification.read;
        Object.assign(notification, updates);
        
        // Update unread count if read status changed
        if (!wasRead && updates.read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
          state.stats.totalRead += 1;
        } else if (wasRead && updates.read === false) {
          state.unreadCount += 1;
          state.stats.totalRead = Math.max(0, state.stats.totalRead - 1);
        }
        
        // Update archived count
        if (updates.archived && !notification.archived) {
          state.stats.totalArchived += 1;
        } else if (updates.archived === false && notification.archived) {
          state.stats.totalArchived = Math.max(0, state.stats.totalArchived - 1);
        }
      }
    },
    
    removeNotification: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const notification = state.notifications.find(n => n.id === id);
      
      if (notification) {
        state.notifications = state.notifications.filter(n => n.id !== id);
        state.totalCount = Math.max(0, state.totalCount - 1);
        
        if (!notification.read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        
        // Update breakdowns
        state.stats.categoryBreakdown[notification.category] = 
          Math.max(0, (state.stats.categoryBreakdown[notification.category] || 0) - 1);
        state.stats.typeBreakdown[notification.type] = 
          Math.max(0, (state.stats.typeBreakdown[notification.type] || 0) - 1);
        state.stats.priorityBreakdown[notification.priority] = 
          Math.max(0, (state.stats.priorityBreakdown[notification.priority] || 0) - 1);
      }
    },
    
    // Bulk operations
    markAsRead: (state, action: PayloadAction<string[]>) => {
      const ids = action.payload;
      let readCount = 0;
      
      ids.forEach(id => {
        const notification = state.notifications.find(n => n.id === id);
        if (notification && !notification.read) {
          notification.read = true;
          readCount++;
        }
      });
      
      state.unreadCount = Math.max(0, state.unreadCount - readCount);
      state.stats.totalRead += readCount;
    },
    
    markAsUnread: (state, action: PayloadAction<string[]>) => {
      const ids = action.payload;
      let unreadCount = 0;
      
      ids.forEach(id => {
        const notification = state.notifications.find(n => n.id === id);
        if (notification && notification.read) {
          notification.read = false;
          unreadCount++;
        }
      });
      
      state.unreadCount += unreadCount;
      state.stats.totalRead = Math.max(0, state.stats.totalRead - unreadCount);
    },
    
    markAllAsRead: (state) => {
      const unreadCount = state.notifications.filter(n => !n.read).length;
      
      state.notifications.forEach(notification => {
        if (!notification.read) {
          notification.read = true;
        }
      });
      
      state.unreadCount = 0;
      state.stats.totalRead += unreadCount;
    },
    
    archiveNotifications: (state, action: PayloadAction<string[]>) => {
      const ids = action.payload;
      let archivedCount = 0;
      
      ids.forEach(id => {
        const notification = state.notifications.find(n => n.id === id);
        if (notification && !notification.archived) {
          notification.archived = true;
          archivedCount++;
        }
      });
      
      state.stats.totalArchived += archivedCount;
    },
    
    deleteNotifications: (state, action: PayloadAction<string[]>) => {
      const ids = action.payload;
      const toDelete = state.notifications.filter(n => ids.includes(n.id));
      
      state.notifications = state.notifications.filter(n => !ids.includes(n.id));
      state.totalCount = Math.max(0, state.totalCount - toDelete.length);
      
      const unreadDeleted = toDelete.filter(n => !n.read).length;
      state.unreadCount = Math.max(0, state.unreadCount - unreadDeleted);
      
      // Update breakdowns
      toDelete.forEach(notification => {
        state.stats.categoryBreakdown[notification.category] = 
          Math.max(0, (state.stats.categoryBreakdown[notification.category] || 0) - 1);
        state.stats.typeBreakdown[notification.type] = 
          Math.max(0, (state.stats.typeBreakdown[notification.type] || 0) - 1);
        state.stats.priorityBreakdown[notification.priority] = 
          Math.max(0, (state.stats.priorityBreakdown[notification.priority] || 0) - 1);
      });
    },
    
    // Settings
    updateSettings: (state, action: PayloadAction<Partial<NotificationSettings>>) => {
      state.settings = { ...state.settings, ...action.payload };
    },
    
    updateCategorySettings: (state, action: PayloadAction<{
      category: string;
      settings: Partial<NotificationSettings['categories'][string]>;
    }>) => {
      const { category, settings } = action.payload;
      state.settings.categories[category] = {
        ...state.settings.categories[category],
        ...settings,
      };
    },
    
    // Filters and sorting
    setFilters: (state, action: PayloadAction<NotificationsState['filters']>) => {
      state.filters = action.payload;
      state.pagination.page = 1; // Reset to first page when filters change
    },
    
    setSorting: (state, action: PayloadAction<NotificationsState['sorting']>) => {
      state.sorting = action.payload;
      state.pagination.page = 1; // Reset to first page when sorting changes
    },
    
    // Pagination
    setPagination: (state, action: PayloadAction<Partial<NotificationsState['pagination']>>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    
    // Loading and error states
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    // WebSocket
    setWebSocketConnected: (state, action: PayloadAction<boolean>) => {
      state.websocketConnected = action.payload;
      if (action.payload) {
        state.lastHeartbeat = Date.now();
      }
    },
    
    updateHeartbeat: (state) => {
      state.lastHeartbeat = Date.now();
    },
    
    // UI state
    setPanelOpen: (state, action: PayloadAction<boolean>) => {
      state.panelOpen = action.payload;
    },
    
    setSelectedNotification: (state, action: PayloadAction<string | null>) => {
      state.selectedNotification = action.payload;
    },
    
    setBulkSelection: (state, action: PayloadAction<string[]>) => {
      state.bulkSelection = action.payload;
    },
    
    toggleBulkSelection: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const index = state.bulkSelection.indexOf(id);
      
      if (index > -1) {
        state.bulkSelection.splice(index, 1);
      } else {
        state.bulkSelection.push(id);
      }
    },
    
    clearBulkSelection: (state) => {
      state.bulkSelection = [];
    },
    
    // Statistics
    updateStats: (state, action: PayloadAction<Partial<NotificationsState['stats']>>) => {
      state.stats = { ...state.stats, ...action.payload };
    },
    
    // Cleanup
    clearOldNotifications: (state, action: PayloadAction<number>) => {
      const cutoffTime = action.payload;
      const oldNotifications = state.notifications.filter(n => n.timestamp < cutoffTime);
      
      state.notifications = state.notifications.filter(n => n.timestamp >= cutoffTime);
      state.totalCount = Math.max(0, state.totalCount - oldNotifications.length);
      
      const unreadDeleted = oldNotifications.filter(n => !n.read).length;
      state.unreadCount = Math.max(0, state.unreadCount - unreadDeleted);
    },
    
    clearAllNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
      state.totalCount = 0;
      state.bulkSelection = [];
      state.selectedNotification = null;
      state.stats = {
        totalReceived: 0,
        totalRead: 0,
        totalArchived: 0,
        averageReadTime: 0,
        categoryBreakdown: {},
        typeBreakdown: {},
        priorityBreakdown: {},
      };
    },
  },
});

export const {
  addNotification,
  setNotifications,
  updateNotification,
  removeNotification,
  markAsRead,
  markAsUnread,
  markAllAsRead,
  archiveNotifications,
  deleteNotifications,
  updateSettings,
  updateCategorySettings,
  setFilters,
  setSorting,
  setPagination,
  setLoading,
  setError,
  setWebSocketConnected,
  updateHeartbeat,
  setPanelOpen,
  setSelectedNotification,
  setBulkSelection,
  toggleBulkSelection,
  clearBulkSelection,
  updateStats,
  clearOldNotifications,
  clearAllNotifications,
} = notificationsSlice.actions;

// Selectors
export const selectNotifications = (state: { notifications: NotificationsState }) => 
  state.notifications.notifications;

export const selectUnreadCount = (state: { notifications: NotificationsState }) => 
  state.notifications.unreadCount;

export const selectNotificationSettings = (state: { notifications: NotificationsState }) => 
  state.notifications.settings;

export const selectNotificationFilters = (state: { notifications: NotificationsState }) => 
  state.notifications.filters;

export const selectNotificationSorting = (state: { notifications: NotificationsState }) => 
  state.notifications.sorting;

export const selectNotificationPagination = (state: { notifications: NotificationsState }) => 
  state.notifications.pagination;

export const selectNotificationStats = (state: { notifications: NotificationsState }) => 
  state.notifications.stats;

export const selectWebSocketConnected = (state: { notifications: NotificationsState }) => 
  state.notifications.websocketConnected;

export const selectNotificationPanelOpen = (state: { notifications: NotificationsState }) => 
  state.notifications.panelOpen;

export const selectBulkSelection = (state: { notifications: NotificationsState }) => 
  state.notifications.bulkSelection;

// Helper selectors
export const selectUnreadNotifications = (state: { notifications: NotificationsState }) => 
  state.notifications.notifications.filter(n => !n.read);

export const selectNotificationsByCategory = (category: string) => 
  (state: { notifications: NotificationsState }) => 
    state.notifications.notifications.filter(n => n.category === category);

export const selectNotificationsByType = (type: string) => 
  (state: { notifications: NotificationsState }) => 
    state.notifications.notifications.filter(n => n.type === type);

export const selectNotificationsByPriority = (priority: string) => 
  (state: { notifications: NotificationsState }) => 
    state.notifications.notifications.filter(n => n.priority === priority);

export const selectRecentNotifications = (hours: number = 24) => 
  (state: { notifications: NotificationsState }) => {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return state.notifications.notifications.filter(n => n.timestamp >= cutoff);
  };

export const selectNotificationById = (id: string) => 
  (state: { notifications: NotificationsState }) => 
    state.notifications.notifications.find(n => n.id === id);

export default notificationsSlice.reducer;