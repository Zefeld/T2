import React, { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { useAuth, useGamification } from '../../store/hooks';
import { cn } from '../../lib/utils';
import {
  ChartBarIcon,
  UsersIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  TrophyIcon,
  FireIcon,
  StarIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import {
  TrophyIcon as TrophyIconSolid,
  FireIcon as FireIconSolid,
  StarIcon as StarIconSolid,
} from '@heroicons/react/24/solid';

interface DashboardCard {
  id: string;
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
    period: string;
  };
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description?: string;
}

interface ActivityItem {
  id: string;
  type: 'stt' | 'tts' | 'achievement' | 'level_up' | 'badge';
  title: string;
  description: string;
  timestamp: Date;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const mockDashboardData: DashboardCard[] = [
  {
    id: 'total-users',
    title: 'Total Users',
    value: '2,847',
    change: { value: 12.5, type: 'increase', period: 'vs last month' },
    icon: UsersIcon,
    color: 'text-blue-600',
    description: 'Active users in the platform',
  },
  {
    id: 'stt-requests',
    title: 'STT Requests',
    value: '18,392',
    change: { value: 8.2, type: 'increase', period: 'vs last week' },
    icon: MicrophoneIcon,
    color: 'text-green-600',
    description: 'Speech-to-text conversions',
  },
  {
    id: 'tts-requests',
    title: 'TTS Requests',
    value: '12,847',
    change: { value: 3.1, type: 'decrease', period: 'vs last week' },
    icon: SpeakerWaveIcon,
    color: 'text-purple-600',
    description: 'Text-to-speech generations',
  },
  {
    id: 'total-xp',
    title: 'Total XP Earned',
    value: '847,293',
    change: { value: 15.7, type: 'increase', period: 'vs last month' },
    icon: StarIcon,
    color: 'text-yellow-600',
    description: 'Experience points across all users',
  },
];

const mockRecentActivity: ActivityItem[] = [
  {
    id: '1',
    type: 'achievement',
    title: 'New Achievement Unlocked',
    description: 'Speech Master - 1000 STT requests completed',
    timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
    icon: TrophyIconSolid,
    color: 'text-yellow-600',
  },
  {
    id: '2',
    type: 'level_up',
    title: 'Level Up!',
    description: 'User John Doe reached Level 15',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    icon: StarIconSolid,
    color: 'text-blue-600',
  },
  {
    id: '3',
    type: 'stt',
    title: 'High STT Usage',
    description: 'Peak usage detected: 150 requests/minute',
    timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 minutes ago
    icon: MicrophoneIcon,
    color: 'text-green-600',
  },
  {
    id: '4',
    type: 'badge',
    title: 'New Badge Earned',
    description: 'Early Bird - First login of the day',
    timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    icon: FireIconSolid,
    color: 'text-orange-600',
  },
  {
    id: '5',
    type: 'tts',
    title: 'TTS Quality Update',
    description: 'Piper model updated to v1.2.0',
    timestamp: new Date(Date.now() - 1000 * 60 * 90), // 1.5 hours ago
    icon: SpeakerWaveIcon,
    color: 'text-purple-600',
  },
];

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

export const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { profile, level, currentXP, nextLevelXP, streak } = useGamification();
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [dashboardData, setDashboardData] = useState(mockDashboardData);
  const [recentActivity, setRecentActivity] = useState(mockRecentActivity);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Update activity with new items occasionally
      if (Math.random() > 0.95) {
        const newActivity: ActivityItem = {
          id: Date.now().toString(),
          type: 'stt',
          title: 'New STT Request',
          description: `User completed speech recognition task`,
          timestamp: new Date(),
          icon: MicrophoneIcon,
          color: 'text-green-600',
        };
        
        setRecentActivity(prev => [newActivity, ...prev.slice(0, 4)]);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const xpProgress = nextLevelXP > 0 ? (currentXP / nextLevelXP) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg p-6 border border-border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">
              {getGreeting()}, {user?.name || 'User'}! 👋
            </h1>
            <p className="text-muted-foreground">
              Welcome back to your T2 Platform dashboard. Here's what's happening today.
            </p>
          </div>
          
          {/* Gamification Summary */}
          <div className="mt-4 lg:mt-0 flex items-center space-x-6">
            <div className="text-center">
              <div className="flex items-center space-x-1 text-sm font-medium">
                <StarIconSolid className="w-4 h-4 text-yellow-500" />
                <span>Level {level}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {currentXP.toLocaleString()} XP
              </div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center space-x-1 text-sm font-medium">
                <FireIconSolid className="w-4 h-4 text-orange-500" />
                <span>{streak} day streak</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Keep it up!
              </div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center space-x-1 text-sm font-medium">
                <TrophyIconSolid className="w-4 h-4 text-yellow-600" />
                <span>{profile?.badges?.length || 0} badges</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Collected
              </div>
            </div>
          </div>
        </div>

        {/* XP Progress Bar */}
        {nextLevelXP > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress to Level {level + 1}</span>
              <span className="font-medium">
                {currentXP.toLocaleString()} / {nextLevelXP.toLocaleString()} XP
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(xpProgress, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Analytics Overview</h2>
        <div className="flex items-center space-x-2">
          <div className="flex bg-muted rounded-lg p-1">
            {(['day', 'week', 'month'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={cn(
                  'px-3 py-1 text-sm font-medium rounded-md transition-colors',
                  {
                    'bg-background shadow-sm': selectedPeriod === period,
                    'hover:bg-background/50': selectedPeriod !== period,
                  }
                )}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardData.map((card) => (
          <div
            key={card.id}
            className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={cn('p-2 rounded-lg bg-muted', card.color)}>
                <card.icon className="w-5 h-5" />
              </div>
              {card.change && (
                <div className={cn(
                  'flex items-center space-x-1 text-sm font-medium',
                  {
                    'text-green-600': card.change.type === 'increase',
                    'text-red-600': card.change.type === 'decrease',
                  }
                )}>
                  {card.change.type === 'increase' ? (
                    <ArrowUpIcon className="w-3 h-3" />
                  ) : (
                    <ArrowDownIcon className="w-3 h-3" />
                  )}
                  <span>{card.change.value}%</span>
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <h3 className="text-2xl font-bold">{card.value}</h3>
              <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
              {card.description && (
                <p className="text-xs text-muted-foreground">{card.description}</p>
              )}
              {card.change && (
                <p className="text-xs text-muted-foreground">{card.change.period}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Placeholder */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Usage Analytics</h3>
            <button className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <EyeIcon className="w-4 h-4" />
              <span>View Details</span>
            </button>
          </div>
          
          {/* Chart Placeholder */}
          <div className="h-64 bg-muted/30 rounded-lg flex items-center justify-center">
            <div className="text-center space-y-2">
              <ChartBarIcon className="w-12 h-12 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Interactive charts will be displayed here
              </p>
              <p className="text-xs text-muted-foreground">
                STT/TTS usage trends, user activity, and performance metrics
              </p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Recent Activity</h3>
            <button className="text-sm text-primary hover:text-primary/80 transition-colors">
              View All
            </button>
          </div>
          
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={cn('p-1.5 rounded-lg bg-muted', activity.color)}>
                  <activity.icon className="w-3 h-3" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{activity.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {activity.description}
                  </p>
                  <div className="flex items-center space-x-1 mt-1">
                    <ClockIcon className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(activity.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors text-left">
            <MicrophoneIcon className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-sm">Test STT</p>
              <p className="text-xs text-muted-foreground">Try speech recognition</p>
            </div>
          </button>
          
          <button className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors text-left">
            <SpeakerWaveIcon className="w-5 h-5 text-purple-600" />
            <div>
              <p className="font-medium text-sm">Test TTS</p>
              <p className="text-xs text-muted-foreground">Generate speech</p>
            </div>
          </button>
          
          <button className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors text-left">
            <ChartBarIcon className="w-5 h-5 text-blue-600" />
            <div>
              <p className="font-medium text-sm">View Analytics</p>
              <p className="text-xs text-muted-foreground">Detailed reports</p>
            </div>
          </button>
          
          <button className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors text-left">
            <CalendarDaysIcon className="w-5 h-5 text-orange-600" />
            <div>
              <p className="font-medium text-sm">Schedule Report</p>
              <p className="text-xs text-muted-foreground">Automated insights</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;