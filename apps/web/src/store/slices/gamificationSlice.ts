import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface XPTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'earned' | 'spent' | 'bonus' | 'penalty' | 'transfer';
  source: 'task_completion' | 'achievement' | 'daily_login' | 'streak' | 'referral' | 'purchase' | 'admin' | 'event';
  description: string;
  metadata?: Record<string, any>;
  timestamp: number;
  relatedEntity?: {
    type: string;
    id: string;
    name?: string;
  };
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  category: 'achievement' | 'skill' | 'social' | 'special' | 'seasonal';
  requirements: {
    type: 'xp' | 'tasks' | 'streak' | 'social' | 'custom';
    value: number;
    conditions?: Record<string, any>;
  };
  rewards: {
    xp?: number;
    title?: string;
    perks?: string[];
  };
  isActive: boolean;
  isSecret: boolean;
  unlockedAt?: number;
  progress?: number;
  maxProgress?: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'progress' | 'milestone' | 'challenge' | 'social' | 'hidden';
  category: 'learning' | 'productivity' | 'social' | 'engagement' | 'special';
  difficulty: 'easy' | 'medium' | 'hard' | 'expert' | 'legendary';
  points: number;
  requirements: {
    criteria: Array<{
      type: string;
      operator: 'eq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains';
      value: any;
      field?: string;
    }>;
    timeframe?: {
      type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';
      duration?: number;
    };
  };
  rewards: {
    xp: number;
    badges?: string[];
    titles?: string[];
    perks?: string[];
    items?: Array<{
      type: string;
      id: string;
      quantity: number;
    }>;
  };
  isUnlocked: boolean;
  isSecret: boolean;
  unlockedAt?: number;
  progress: number;
  maxProgress: number;
  nextMilestone?: number;
}

export interface Quest {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special' | 'story';
  category: 'learning' | 'productivity' | 'social' | 'exploration';
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  status: 'available' | 'active' | 'completed' | 'expired' | 'locked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  
  objectives: Array<{
    id: string;
    description: string;
    type: string;
    target: number;
    current: number;
    completed: boolean;
    optional: boolean;
  }>;
  
  requirements: {
    level?: number;
    badges?: string[];
    achievements?: string[];
    quests?: string[];
    timeframe?: {
      start: number;
      end: number;
    };
  };
  
  rewards: {
    xp: number;
    badges?: string[];
    achievements?: string[];
    items?: Array<{
      type: string;
      id: string;
      quantity: number;
    }>;
    currency?: Record<string, number>;
  };
  
  progress: number;
  maxProgress: number;
  startedAt?: number;
  completedAt?: number;
  expiresAt?: number;
  
  metadata?: Record<string, any>;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  displayName: string;
  avatar?: string;
  score: number;
  rank: number;
  previousRank?: number;
  change: 'up' | 'down' | 'same' | 'new';
  badges: Badge[];
  level: number;
  title?: string;
  metadata?: Record<string, any>;
}

export interface Leaderboard {
  id: string;
  name: string;
  description: string;
  type: 'global' | 'department' | 'team' | 'friends' | 'custom';
  category: 'xp' | 'achievements' | 'tasks' | 'streaks' | 'social' | 'custom';
  timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all_time';
  entries: LeaderboardEntry[];
  userRank?: number;
  totalParticipants: number;
  lastUpdated: number;
  isActive: boolean;
  settings: {
    maxEntries: number;
    updateFrequency: number; // minutes
    includeInactive: boolean;
    anonymizeUsers: boolean;
  };
}

export interface UserLevel {
  current: number;
  xp: number;
  xpForNext: number;
  xpForCurrent: number;
  progress: number; // 0-1
  title: string;
  perks: string[];
  nextLevelPerks: string[];
}

export interface GamificationProfile {
  userId: string;
  level: UserLevel;
  totalXP: number;
  availableXP: number;
  spentXP: number;
  
  badges: Badge[];
  achievements: Achievement[];
  activeQuests: Quest[];
  completedQuests: Quest[];
  
  streaks: {
    current: number;
    longest: number;
    lastActivity: number;
    type: 'daily' | 'weekly';
  };
  
  statistics: {
    tasksCompleted: number;
    achievementsUnlocked: number;
    badgesEarned: number;
    questsCompleted: number;
    socialInteractions: number;
    timeSpent: number; // minutes
    averageSessionTime: number; // minutes
    lastActivity: number;
    joinedAt: number;
  };
  
  preferences: {
    notifications: {
      achievements: boolean;
      levelUp: boolean;
      badges: boolean;
      quests: boolean;
      leaderboard: boolean;
    };
    privacy: {
      showProfile: boolean;
      showStats: boolean;
      showBadges: boolean;
      showAchievements: boolean;
      allowComparisons: boolean;
    };
    display: {
      showXP: boolean;
      showLevel: boolean;
      showProgress: boolean;
      animateRewards: boolean;
      soundEffects: boolean;
    };
  };
  
  titles: Array<{
    id: string;
    name: string;
    description: string;
    isActive: boolean;
    unlockedAt: number;
  }>;
  
  inventory: Array<{
    itemId: string;
    itemType: string;
    quantity: number;
    acquiredAt: number;
    metadata?: Record<string, any>;
  }>;
}

export interface GamificationState {
  profile: GamificationProfile | null;
  xpHistory: XPTransaction[];
  
  // Available content
  availableBadges: Badge[];
  availableAchievements: Achievement[];
  availableQuests: Quest[];
  availableTitles: Array<{
    id: string;
    name: string;
    description: string;
    requirements: Record<string, any>;
  }>;
  
  // Leaderboards
  leaderboards: Record<string, Leaderboard>;
  userRankings: Record<string, number>;
  
  // Recent activities
  recentRewards: Array<{
    type: 'xp' | 'badge' | 'achievement' | 'level' | 'quest' | 'title';
    id: string;
    name: string;
    description: string;
    icon?: string;
    amount?: number;
    timestamp: number;
    seen: boolean;
  }>;
  
  // UI state
  showRewardModal: boolean;
  pendingRewards: Array<{
    type: string;
    data: any;
  }>;
  
  // Loading states
  isLoading: boolean;
  isLoadingProfile: boolean;
  isLoadingLeaderboards: boolean;
  isLoadingQuests: boolean;
  
  // Error states
  error: string | null;
  profileError: string | null;
  leaderboardError: string | null;
  questError: string | null;
  
  // Cache
  lastFetch: {
    profile: number | null;
    leaderboards: number | null;
    quests: number | null;
    achievements: number | null;
  };
  
  // Real-time updates
  websocketConnected: boolean;
  liveUpdates: boolean;
  
  // Analytics
  sessionStats: {
    startTime: number;
    xpEarned: number;
    achievementsUnlocked: number;
    badgesEarned: number;
    questsCompleted: number;
    tasksCompleted: number;
  };
}

const initialState: GamificationState = {
  profile: null,
  xpHistory: [],
  
  availableBadges: [],
  availableAchievements: [],
  availableQuests: [],
  availableTitles: [],
  
  leaderboards: {},
  userRankings: {},
  
  recentRewards: [],
  
  showRewardModal: false,
  pendingRewards: [],
  
  isLoading: false,
  isLoadingProfile: false,
  isLoadingLeaderboards: false,
  isLoadingQuests: false,
  
  error: null,
  profileError: null,
  leaderboardError: null,
  questError: null,
  
  lastFetch: {
    profile: null,
    leaderboards: null,
    quests: null,
    achievements: null,
  },
  
  websocketConnected: false,
  liveUpdates: true,
  
  sessionStats: {
    startTime: Date.now(),
    xpEarned: 0,
    achievementsUnlocked: 0,
    badgesEarned: 0,
    questsCompleted: 0,
    tasksCompleted: 0,
  },
};

const gamificationSlice = createSlice({
  name: 'gamification',
  initialState,
  reducers: {
    // Profile management
    setProfile: (state, action: PayloadAction<GamificationProfile>) => {
      state.profile = action.payload;
      state.lastFetch.profile = Date.now();
      state.profileError = null;
    },
    
    updateProfile: (state, action: PayloadAction<Partial<GamificationProfile>>) => {
      if (state.profile) {
        state.profile = { ...state.profile, ...action.payload };
      }
    },
    
    updateUserLevel: (state, action: PayloadAction<UserLevel>) => {
      if (state.profile) {
        const oldLevel = state.profile.level.current;
        state.profile.level = action.payload;
        
        // Check for level up
        if (action.payload.current > oldLevel) {
          state.recentRewards.unshift({
            type: 'level',
            id: `level-${action.payload.current}`,
            name: `Level ${action.payload.current}`,
            description: `Congratulations! You've reached level ${action.payload.current}!`,
            timestamp: Date.now(),
            seen: false,
          });
        }
      }
    },
    
    // XP management
    addXPTransaction: (state, action: PayloadAction<XPTransaction>) => {
      const transaction = action.payload;
      state.xpHistory.unshift(transaction);
      
      if (state.profile) {
        if (transaction.type === 'earned' || transaction.type === 'bonus') {
          state.profile.totalXP += transaction.amount;
          state.profile.availableXP += transaction.amount;
          state.sessionStats.xpEarned += transaction.amount;
          
          // Add XP reward notification
          state.recentRewards.unshift({
            type: 'xp',
            id: transaction.id,
            name: `+${transaction.amount} XP`,
            description: transaction.description,
            amount: transaction.amount,
            timestamp: transaction.timestamp,
            seen: false,
          });
        } else if (transaction.type === 'spent') {
          state.profile.availableXP = Math.max(0, state.profile.availableXP - transaction.amount);
          state.profile.spentXP += transaction.amount;
        }
      }
    },
    
    setXPHistory: (state, action: PayloadAction<XPTransaction[]>) => {
      state.xpHistory = action.payload;
    },
    
    // Badges
    setAvailableBadges: (state, action: PayloadAction<Badge[]>) => {
      state.availableBadges = action.payload;
    },
    
    unlockBadge: (state, action: PayloadAction<Badge>) => {
      const badge = action.payload;
      
      if (state.profile) {
        const existingBadge = state.profile.badges.find(b => b.id === badge.id);
        if (!existingBadge) {
          state.profile.badges.push(badge);
          state.sessionStats.badgesEarned += 1;
          
          state.recentRewards.unshift({
            type: 'badge',
            id: badge.id,
            name: badge.name,
            description: badge.description,
            icon: badge.icon,
            timestamp: Date.now(),
            seen: false,
          });
        }
      }
    },
    
    updateBadgeProgress: (state, action: PayloadAction<{
      badgeId: string;
      progress: number;
    }>) => {
      const { badgeId, progress } = action.payload;
      
      if (state.profile) {
        const badge = state.profile.badges.find(b => b.id === badgeId);
        if (badge) {
          badge.progress = progress;
        }
      }
      
      // Also update in available badges
      const availableBadge = state.availableBadges.find(b => b.id === badgeId);
      if (availableBadge) {
        availableBadge.progress = progress;
      }
    },
    
    // Achievements
    setAvailableAchievements: (state, action: PayloadAction<Achievement[]>) => {
      state.availableAchievements = action.payload;
      state.lastFetch.achievements = Date.now();
    },
    
    unlockAchievement: (state, action: PayloadAction<Achievement>) => {
      const achievement = action.payload;
      
      if (state.profile) {
        const existingAchievement = state.profile.achievements.find(a => a.id === achievement.id);
        if (!existingAchievement) {
          state.profile.achievements.push(achievement);
          state.sessionStats.achievementsUnlocked += 1;
          
          state.recentRewards.unshift({
            type: 'achievement',
            id: achievement.id,
            name: achievement.name,
            description: achievement.description,
            icon: achievement.icon,
            timestamp: Date.now(),
            seen: false,
          });
        }
      }
    },
    
    updateAchievementProgress: (state, action: PayloadAction<{
      achievementId: string;
      progress: number;
    }>) => {
      const { achievementId, progress } = action.payload;
      
      if (state.profile) {
        const achievement = state.profile.achievements.find(a => a.id === achievementId);
        if (achievement) {
          achievement.progress = progress;
        }
      }
      
      // Also update in available achievements
      const availableAchievement = state.availableAchievements.find(a => a.id === achievementId);
      if (availableAchievement) {
        availableAchievement.progress = progress;
      }
    },
    
    // Quests
    setAvailableQuests: (state, action: PayloadAction<Quest[]>) => {
      state.availableQuests = action.payload;
      state.lastFetch.quests = Date.now();
    },
    
    startQuest: (state, action: PayloadAction<Quest>) => {
      const quest = { ...action.payload, status: 'active' as const, startedAt: Date.now() };
      
      if (state.profile) {
        state.profile.activeQuests.push(quest);
      }
    },
    
    updateQuestProgress: (state, action: PayloadAction<{
      questId: string;
      objectiveId?: string;
      progress?: number;
      objectiveProgress?: number;
    }>) => {
      const { questId, objectiveId, progress, objectiveProgress } = action.payload;
      
      if (state.profile) {
        const quest = state.profile.activeQuests.find(q => q.id === questId);
        if (quest) {
          if (progress !== undefined) {
            quest.progress = progress;
          }
          
          if (objectiveId && objectiveProgress !== undefined) {
            const objective = quest.objectives.find(o => o.id === objectiveId);
            if (objective) {
              objective.current = objectiveProgress;
              objective.completed = objective.current >= objective.target;
            }
          }
        }
      }
    },
    
    completeQuest: (state, action: PayloadAction<string>) => {
      const questId = action.payload;
      
      if (state.profile) {
        const questIndex = state.profile.activeQuests.findIndex(q => q.id === questId);
        if (questIndex > -1) {
          const quest = state.profile.activeQuests[questIndex];
          quest.status = 'completed';
          quest.completedAt = Date.now();
          
          // Move to completed quests
          state.profile.completedQuests.push(quest);
          state.profile.activeQuests.splice(questIndex, 1);
          state.sessionStats.questsCompleted += 1;
          
          state.recentRewards.unshift({
            type: 'quest',
            id: quest.id,
            name: quest.name,
            description: `Quest completed: ${quest.description}`,
            icon: quest.icon,
            timestamp: Date.now(),
            seen: false,
          });
        }
      }
    },
    
    // Leaderboards
    setLeaderboard: (state, action: PayloadAction<{
      id: string;
      leaderboard: Leaderboard;
    }>) => {
      const { id, leaderboard } = action.payload;
      state.leaderboards[id] = leaderboard;
      
      // Update user ranking
      const userEntry = leaderboard.entries.find(entry => 
        state.profile && entry.userId === state.profile.userId
      );
      if (userEntry) {
        state.userRankings[id] = userEntry.rank;
      }
      
      state.lastFetch.leaderboards = Date.now();
    },
    
    updateLeaderboardEntry: (state, action: PayloadAction<{
      leaderboardId: string;
      userId: string;
      updates: Partial<LeaderboardEntry>;
    }>) => {
      const { leaderboardId, userId, updates } = action.payload;
      const leaderboard = state.leaderboards[leaderboardId];
      
      if (leaderboard) {
        const entry = leaderboard.entries.find(e => e.userId === userId);
        if (entry) {
          Object.assign(entry, updates);
        }
      }
    },
    
    // Streaks
    updateStreak: (state, action: PayloadAction<{
      current: number;
      longest: number;
      lastActivity: number;
      type: 'daily' | 'weekly';
    }>) => {
      if (state.profile) {
        state.profile.streaks = action.payload;
      }
    },
    
    // Statistics
    updateStatistics: (state, action: PayloadAction<Partial<GamificationProfile['statistics']>>) => {
      if (state.profile) {
        state.profile.statistics = { ...state.profile.statistics, ...action.payload };
      }
    },
    
    incrementTasksCompleted: (state) => {
      if (state.profile) {
        state.profile.statistics.tasksCompleted += 1;
        state.sessionStats.tasksCompleted += 1;
      }
    },
    
    // Preferences
    updatePreferences: (state, action: PayloadAction<Partial<GamificationProfile['preferences']>>) => {
      if (state.profile) {
        state.profile.preferences = { ...state.profile.preferences, ...action.payload };
      }
    },
    
    // Titles
    unlockTitle: (state, action: PayloadAction<{
      id: string;
      name: string;
      description: string;
    }>) => {
      const title = { ...action.payload, isActive: false, unlockedAt: Date.now() };
      
      if (state.profile) {
        const existingTitle = state.profile.titles.find(t => t.id === title.id);
        if (!existingTitle) {
          state.profile.titles.push(title);
          
          state.recentRewards.unshift({
            type: 'title',
            id: title.id,
            name: title.name,
            description: title.description,
            timestamp: Date.now(),
            seen: false,
          });
        }
      }
    },
    
    setActiveTitle: (state, action: PayloadAction<string>) => {
      const titleId = action.payload;
      
      if (state.profile) {
        // Deactivate all titles
        state.profile.titles.forEach(title => {
          title.isActive = false;
        });
        
        // Activate selected title
        const title = state.profile.titles.find(t => t.id === titleId);
        if (title) {
          title.isActive = true;
        }
      }
    },
    
    // Rewards and notifications
    addReward: (state, action: PayloadAction<{
      type: string;
      data: any;
    }>) => {
      state.pendingRewards.push(action.payload);
      state.showRewardModal = true;
    },
    
    markRewardAsSeen: (state, action: PayloadAction<string>) => {
      const rewardId = action.payload;
      const reward = state.recentRewards.find(r => r.id === rewardId);
      if (reward) {
        reward.seen = true;
      }
    },
    
    markAllRewardsAsSeen: (state) => {
      state.recentRewards.forEach(reward => {
        reward.seen = true;
      });
    },
    
    clearPendingRewards: (state) => {
      state.pendingRewards = [];
      state.showRewardModal = false;
    },
    
    // UI state
    setShowRewardModal: (state, action: PayloadAction<boolean>) => {
      state.showRewardModal = action.payload;
    },
    
    // Loading states
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    setLoadingProfile: (state, action: PayloadAction<boolean>) => {
      state.isLoadingProfile = action.payload;
    },
    
    setLoadingLeaderboards: (state, action: PayloadAction<boolean>) => {
      state.isLoadingLeaderboards = action.payload;
    },
    
    setLoadingQuests: (state, action: PayloadAction<boolean>) => {
      state.isLoadingQuests = action.payload;
    },
    
    // Error states
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    setProfileError: (state, action: PayloadAction<string | null>) => {
      state.profileError = action.payload;
    },
    
    setLeaderboardError: (state, action: PayloadAction<string | null>) => {
      state.leaderboardError = action.payload;
    },
    
    setQuestError: (state, action: PayloadAction<string | null>) => {
      state.questError = action.payload;
    },
    
    // WebSocket
    setWebSocketConnected: (state, action: PayloadAction<boolean>) => {
      state.websocketConnected = action.payload;
    },
    
    setLiveUpdates: (state, action: PayloadAction<boolean>) => {
      state.liveUpdates = action.payload;
    },
    
    // Session stats
    resetSessionStats: (state) => {
      state.sessionStats = {
        startTime: Date.now(),
        xpEarned: 0,
        achievementsUnlocked: 0,
        badgesEarned: 0,
        questsCompleted: 0,
        tasksCompleted: 0,
      };
    },
    
    // Cleanup
    clearOldRewards: (state, action: PayloadAction<number>) => {
      const cutoffTime = action.payload;
      state.recentRewards = state.recentRewards.filter(r => r.timestamp >= cutoffTime);
    },
    
    clearProfile: (state) => {
      state.profile = null;
      state.xpHistory = [];
      state.recentRewards = [];
      state.userRankings = {};
    },
  },
});

export const {
  setProfile,
  updateProfile,
  updateUserLevel,
  addXPTransaction,
  setXPHistory,
  setAvailableBadges,
  unlockBadge,
  updateBadgeProgress,
  setAvailableAchievements,
  unlockAchievement,
  updateAchievementProgress,
  setAvailableQuests,
  startQuest,
  updateQuestProgress,
  completeQuest,
  setLeaderboard,
  updateLeaderboardEntry,
  updateStreak,
  updateStatistics,
  incrementTasksCompleted,
  updatePreferences,
  unlockTitle,
  setActiveTitle,
  addReward,
  markRewardAsSeen,
  markAllRewardsAsSeen,
  clearPendingRewards,
  setShowRewardModal,
  setLoading,
  setLoadingProfile,
  setLoadingLeaderboards,
  setLoadingQuests,
  setError,
  setProfileError,
  setLeaderboardError,
  setQuestError,
  setWebSocketConnected,
  setLiveUpdates,
  resetSessionStats,
  clearOldRewards,
  clearProfile,
} = gamificationSlice.actions;

// Selectors
export const selectGamificationProfile = (state: { gamification: GamificationState }) => 
  state.gamification.profile;

export const selectUserLevel = (state: { gamification: GamificationState }) => 
  state.gamification.profile?.level;

export const selectUserXP = (state: { gamification: GamificationState }) => ({
  total: state.gamification.profile?.totalXP || 0,
  available: state.gamification.profile?.availableXP || 0,
  spent: state.gamification.profile?.spentXP || 0,
});

export const selectUserBadges = (state: { gamification: GamificationState }) => 
  state.gamification.profile?.badges || [];

export const selectUserAchievements = (state: { gamification: GamificationState }) => 
  state.gamification.profile?.achievements || [];

export const selectActiveQuests = (state: { gamification: GamificationState }) => 
  state.gamification.profile?.activeQuests || [];

export const selectCompletedQuests = (state: { gamification: GamificationState }) => 
  state.gamification.profile?.completedQuests || [];

export const selectLeaderboards = (state: { gamification: GamificationState }) => 
  state.gamification.leaderboards;

export const selectUserRankings = (state: { gamification: GamificationState }) => 
  state.gamification.userRankings;

export const selectRecentRewards = (state: { gamification: GamificationState }) => 
  state.gamification.recentRewards;

export const selectUnseenRewards = (state: { gamification: GamificationState }) => 
  state.gamification.recentRewards.filter(r => !r.seen);

export const selectSessionStats = (state: { gamification: GamificationState }) => 
  state.gamification.sessionStats;

export const selectGamificationStats = (state: { gamification: GamificationState }) => 
  state.gamification.profile?.statistics;

export const selectUserStreak = (state: { gamification: GamificationState }) => 
  state.gamification.profile?.streaks;

export const selectGamificationPreferences = (state: { gamification: GamificationState }) => 
  state.gamification.profile?.preferences;

export const selectUserTitles = (state: { gamification: GamificationState }) => 
  state.gamification.profile?.titles || [];

export const selectActiveTitle = (state: { gamification: GamificationState }) => 
  state.gamification.profile?.titles.find(t => t.isActive);

// Helper selectors
export const selectBadgesByCategory = (category: string) => 
  (state: { gamification: GamificationState }) => 
    state.gamification.profile?.badges.filter(b => b.category === category) || [];

export const selectAchievementsByCategory = (category: string) => 
  (state: { gamification: GamificationState }) => 
    state.gamification.profile?.achievements.filter(a => a.category === category) || [];

export const selectQuestsByType = (type: string) => 
  (state: { gamification: GamificationState }) => 
    state.gamification.profile?.activeQuests.filter(q => q.type === type) || [];

export const selectLeaderboardByType = (type: string) => 
  (state: { gamification: GamificationState }) => 
    Object.values(state.gamification.leaderboards).find(l => l.type === type);

export const selectXPTransactionsByType = (type: string) => 
  (state: { gamification: GamificationState }) => 
    state.gamification.xpHistory.filter(t => t.type === type);

export const selectRecentXPTransactions = (hours: number = 24) => 
  (state: { gamification: GamificationState }) => {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return state.gamification.xpHistory.filter(t => t.timestamp >= cutoff);
  };

export default gamificationSlice.reducer;