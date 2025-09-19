import { createApi } from '@reduxjs/toolkit/query/react';
import { baseApi, ApiResponse, PaginatedResponse } from './baseApi';

// Types
export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  level: number;
  currentXP: number;
  totalXP: number;
  xpToNextLevel: number;
  rank: number;
  title?: string;
  joinedAt: string;
  lastActiveAt: string;
  streak: {
    current: number;
    longest: number;
    lastActivityDate: string;
  };
  stats: {
    tasksCompleted: number;
    projectsCompleted: number;
    collaborations: number;
    mentoringSessions: number;
    skillsLearned: number;
    certificationsEarned: number;
  };
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'achievement' | 'skill' | 'collaboration' | 'leadership' | 'learning' | 'special';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  xpReward: number;
  requirements: BadgeRequirement[];
  isActive: boolean;
  createdAt: string;
}

export interface BadgeRequirement {
  type: 'task_completion' | 'project_completion' | 'skill_level' | 'collaboration' | 'streak' | 'custom';
  target: number;
  description: string;
  metadata?: Record<string, any>;
}

export interface UserBadge {
  id: string;
  badgeId: string;
  badge: Badge;
  earnedAt: string;
  progress?: {
    current: number;
    target: number;
    percentage: number;
  };
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  xpReward: number;
  badgeReward?: string;
  requirements: AchievementRequirement[];
  isHidden: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface AchievementRequirement {
  type: string;
  condition: string;
  target: any;
  description: string;
}

export interface UserAchievement {
  id: string;
  achievementId: string;
  achievement: Achievement;
  earnedAt: string;
  progress: {
    current: number;
    target: number;
    percentage: number;
    isCompleted: boolean;
  };
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  category: 'daily' | 'weekly' | 'monthly' | 'special' | 'story';
  difficulty: 'easy' | 'medium' | 'hard';
  xpReward: number;
  badgeRewards: string[];
  requirements: QuestRequirement[];
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  maxParticipants?: number;
  currentParticipants: number;
}

export interface QuestRequirement {
  type: string;
  description: string;
  target: any;
  isOptional: boolean;
}

export interface UserQuest {
  id: string;
  questId: string;
  quest: Quest;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed' | 'expired';
  progress: Array<{
    requirementId: string;
    current: number;
    target: number;
    isCompleted: boolean;
  }>;
  startedAt?: string;
  completedAt?: string;
  expiresAt?: string;
}

export interface Leaderboard {
  id: string;
  name: string;
  description: string;
  type: 'xp' | 'level' | 'badges' | 'achievements' | 'custom';
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'all_time';
  category?: string;
  department?: string;
  isActive: boolean;
  entries: LeaderboardEntry[];
  lastUpdated: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
    department?: string;
  };
  score: number;
  change: number;
  changeType: 'up' | 'down' | 'same' | 'new';
}

export interface XPTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'earned' | 'bonus' | 'penalty' | 'adjustment';
  source: 'task' | 'project' | 'badge' | 'achievement' | 'quest' | 'manual' | 'streak';
  sourceId?: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface GamificationStats {
  totalUsers: number;
  activeUsers: number;
  totalXPAwarded: number;
  totalBadgesEarned: number;
  totalAchievementsUnlocked: number;
  averageLevel: number;
  topPerformers: Array<{
    userId: string;
    username: string;
    displayName: string;
    totalXP: number;
    level: number;
    badgeCount: number;
  }>;
  engagementMetrics: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    averageSessionTime: number;
    retentionRate: number;
  };
  popularBadges: Array<{
    badgeId: string;
    name: string;
    earnedCount: number;
    percentage: number;
  }>;
}

// Gamification API
export const gamificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // User Profile
    getMyProfile: builder.query<ApiResponse<UserProfile>, void>({
      query: () => '/api/gamification/profile',
      providesTags: ['GamificationProfile'],
    }),
    
    getUserProfile: builder.query<ApiResponse<UserProfile>, string>({
      query: (userId) => `/api/gamification/users/${userId}/profile`,
    }),
    
    updateProfile: builder.mutation<ApiResponse<UserProfile>, {
      displayName?: string;
      avatar?: File;
      title?: string;
    }>({
      query: ({ avatar, ...body }) => {
        if (avatar) {
          const formData = new FormData();
          formData.append('avatar', avatar);
          Object.entries(body).forEach(([key, value]) => {
            if (value !== undefined) {
              formData.append(key, value.toString());
            }
          });
          
          return {
            url: '/api/gamification/profile',
            method: 'PATCH',
            body: formData,
            formData: true,
          };
        }
        
        return {
          url: '/api/gamification/profile',
          method: 'PATCH',
          body,
        };
      },
      invalidatesTags: ['GamificationProfile'],
    }),
    
    // XP System
    getXPHistory: builder.query<ApiResponse<XPTransaction[]>, {
      page?: number;
      limit?: number;
      type?: string;
      source?: string;
    }>({
      query: ({ page = 1, limit = 20, type, source } = {}) => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });
        
        if (type) params.append('type', type);
        if (source) params.append('source', source);
        
        return `/api/gamification/xp/history?${params.toString()}`;
      },
    }),
    
    awardXP: builder.mutation<ApiResponse<XPTransaction>, {
      userId: string;
      amount: number;
      source: string;
      sourceId?: string;
      description: string;
      metadata?: Record<string, any>;
    }>({
      query: (body) => ({
        url: '/api/gamification/xp/award',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['GamificationProfile'],
    }),
    
    // Badges
    getBadges: builder.query<ApiResponse<Badge[]>, {
      category?: string;
      rarity?: string;
      isActive?: boolean;
    }>({
      query: ({ category, rarity, isActive } = {}) => {
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (rarity) params.append('rarity', rarity);
        if (isActive !== undefined) params.append('isActive', isActive.toString());
        
        return `/api/gamification/badges?${params.toString()}`;
      },
      providesTags: ['Badge'],
    }),
    
    getMyBadges: builder.query<ApiResponse<UserBadge[]>, {
      category?: string;
      earned?: boolean;
    }>({
      query: ({ category, earned } = {}) => {
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (earned !== undefined) params.append('earned', earned.toString());
        
        return `/api/gamification/badges/my?${params.toString()}`;
      },
      providesTags: ['UserBadge'],
    }),
    
    getBadgeProgress: builder.query<ApiResponse<Array<{
      badgeId: string;
      badge: Badge;
      progress: Array<{
        requirementId: string;
        current: number;
        target: number;
        percentage: number;
        isCompleted: boolean;
      }>;
      overallProgress: number;
      canEarn: boolean;
    }>>, void>({
      query: () => '/api/gamification/badges/progress',
    }),
    
    createBadge: builder.mutation<ApiResponse<Badge>, Omit<Badge, 'id' | 'createdAt'>>({
      query: (body) => ({
        url: '/api/gamification/badges',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Badge'],
    }),
    
    // Achievements
    getAchievements: builder.query<ApiResponse<Achievement[]>, {
      category?: string;
      difficulty?: string;
      isHidden?: boolean;
    }>({
      query: ({ category, difficulty, isHidden } = {}) => {
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (difficulty) params.append('difficulty', difficulty);
        if (isHidden !== undefined) params.append('isHidden', isHidden.toString());
        
        return `/api/gamification/achievements?${params.toString()}`;
      },
      providesTags: ['Achievement'],
    }),
    
    getMyAchievements: builder.query<ApiResponse<UserAchievement[]>, {
      completed?: boolean;
      category?: string;
    }>({
      query: ({ completed, category } = {}) => {
        const params = new URLSearchParams();
        if (completed !== undefined) params.append('completed', completed.toString());
        if (category) params.append('category', category);
        
        return `/api/gamification/achievements/my?${params.toString()}`;
      },
      providesTags: ['UserAchievement'],
    }),
    
    // Quests
    getQuests: builder.query<ApiResponse<Quest[]>, {
      category?: string;
      difficulty?: string;
      isActive?: boolean;
    }>({
      query: ({ category, difficulty, isActive } = {}) => {
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (difficulty) params.append('difficulty', difficulty);
        if (isActive !== undefined) params.append('isActive', isActive.toString());
        
        return `/api/gamification/quests?${params.toString()}`;
      },
      providesTags: ['Quest'],
    }),
    
    getMyQuests: builder.query<ApiResponse<UserQuest[]>, {
      status?: string;
      category?: string;
    }>({
      query: ({ status, category } = {}) => {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (category) params.append('category', category);
        
        return `/api/gamification/quests/my?${params.toString()}`;
      },
      providesTags: ['UserQuest'],
    }),
    
    startQuest: builder.mutation<ApiResponse<UserQuest>, string>({
      query: (questId) => ({
        url: `/api/gamification/quests/${questId}/start`,
        method: 'POST',
      }),
      invalidatesTags: ['UserQuest'],
    }),
    
    abandonQuest: builder.mutation<ApiResponse, string>({
      query: (questId) => ({
        url: `/api/gamification/quests/${questId}/abandon`,
        method: 'POST',
      }),
      invalidatesTags: ['UserQuest'],
    }),
    
    // Leaderboards
    getLeaderboards: builder.query<ApiResponse<Leaderboard[]>, {
      type?: string;
      period?: string;
      category?: string;
    }>({
      query: ({ type, period, category } = {}) => {
        const params = new URLSearchParams();
        if (type) params.append('type', type);
        if (period) params.append('period', period);
        if (category) params.append('category', category);
        
        return `/api/gamification/leaderboards?${params.toString()}`;
      },
      providesTags: ['Leaderboard'],
    }),
    
    getLeaderboard: builder.query<ApiResponse<Leaderboard>, {
      leaderboardId: string;
      limit?: number;
    }>({
      query: ({ leaderboardId, limit = 50 }) => 
        `/api/gamification/leaderboards/${leaderboardId}?limit=${limit}`,
    }),
    
    getMyRank: builder.query<ApiResponse<{
      leaderboardId: string;
      rank: number;
      score: number;
      percentile: number;
      change: number;
      changeType: 'up' | 'down' | 'same' | 'new';
    }>, string>({
      query: (leaderboardId) => `/api/gamification/leaderboards/${leaderboardId}/my-rank`,
    }),
    
    // Statistics
    getGamificationStats: builder.query<ApiResponse<GamificationStats>, {
      period?: string;
      department?: string;
    }>({
      query: ({ period, department } = {}) => {
        const params = new URLSearchParams();
        if (period) params.append('period', period);
        if (department) params.append('department', department);
        
        return `/api/gamification/stats?${params.toString()}`;
      },
    }),
    
    getMyStats: builder.query<ApiResponse<{
      totalXP: number;
      level: number;
      rank: number;
      badgesEarned: number;
      achievementsUnlocked: number;
      questsCompleted: number;
      streakDays: number;
      weeklyActivity: Array<{ date: string; xp: number; activities: number }>;
      categoryBreakdown: Array<{ category: string; xp: number; percentage: number }>;
      recentActivities: Array<{
        type: string;
        description: string;
        xp: number;
        timestamp: string;
      }>;
    }>, { period?: string }>({
      query: ({ period = 'month' } = {}) => `/api/gamification/stats/my?period=${period}`,
    }),
    
    // Social Features
    getTopPerformers: builder.query<ApiResponse<Array<{
      userId: string;
      username: string;
      displayName: string;
      avatar?: string;
      level: number;
      totalXP: number;
      badgeCount: number;
      rank: number;
    }>>, {
      period?: string;
      category?: string;
      limit?: number;
    }>({
      query: ({ period = 'month', category, limit = 10 } = {}) => {
        const params = new URLSearchParams({
          period,
          limit: limit.toString(),
        });
        
        if (category) params.append('category', category);
        
        return `/api/gamification/top-performers?${params.toString()}`;
      },
    }),
    
    // Notifications
    getGamificationNotifications: builder.query<ApiResponse<Array<{
      id: string;
      type: 'badge_earned' | 'achievement_unlocked' | 'level_up' | 'quest_completed' | 'rank_change';
      title: string;
      message: string;
      data: Record<string, any>;
      isRead: boolean;
      createdAt: string;
    }>>, { limit?: number }>({
      query: ({ limit = 20 } = {}) => `/api/gamification/notifications?limit=${limit}`,
      providesTags: ['GamificationNotification'],
    }),
    
    markNotificationRead: builder.mutation<ApiResponse, string>({
      query: (notificationId) => ({
        url: `/api/gamification/notifications/${notificationId}/read`,
        method: 'POST',
      }),
      invalidatesTags: ['GamificationNotification'],
    }),
  }),
});

// Export hooks
export const {
  useGetMyProfileQuery,
  useGetUserProfileQuery,
  useUpdateProfileMutation,
  useGetXPHistoryQuery,
  useAwardXPMutation,
  useGetBadgesQuery,
  useGetMyBadgesQuery,
  useGetBadgeProgressQuery,
  useCreateBadgeMutation,
  useGetAchievementsQuery,
  useGetMyAchievementsQuery,
  useGetQuestsQuery,
  useGetMyQuestsQuery,
  useStartQuestMutation,
  useAbandonQuestMutation,
  useGetLeaderboardsQuery,
  useGetLeaderboardQuery,
  useGetMyRankQuery,
  useGetGamificationStatsQuery,
  useGetMyStatsQuery,
  useGetTopPerformersQuery,
  useGetGamificationNotificationsQuery,
  useMarkNotificationReadMutation,
} = gamificationApi;