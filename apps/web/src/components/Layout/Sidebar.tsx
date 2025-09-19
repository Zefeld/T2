import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { toggleSidebar, setSidebarCollapsed } from '../../store/slices/uiSlice';
import { useUserLevel, useUserXP } from '../../store/hooks';
import { cn } from '../../lib/utils';
import {
  HomeIcon,
  UserIcon,
  ChartBarIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  ChatBubbleLeftRightIcon,
  TrophyIcon,
  CogIcon,
  QuestionMarkCircleIcon,
  Bars3Icon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  StarIcon,
  FireIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  UserIcon as UserIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  MicrophoneIcon as MicrophoneIconSolid,
  SpeakerWaveIcon as SpeakerWaveIconSolid,
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid,
  TrophyIcon as TrophyIconSolid,
  CogIcon as CogIconSolid,
} from '@heroicons/react/24/solid';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconSolid: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  description?: string;
  requiredLevel?: number;
  comingSoon?: boolean;
}

const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: HomeIcon,
    iconSolid: HomeIconSolid,
    description: 'Overview and quick actions',
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: UserIcon,
    iconSolid: UserIconSolid,
    description: 'Manage your profile and preferences',
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: ChartBarIcon,
    iconSolid: ChartBarIconSolid,
    description: 'HR analytics and insights',
    requiredLevel: 2,
  },
  {
    name: 'Voice STT',
    href: '/voice/stt',
    icon: MicrophoneIcon,
    iconSolid: MicrophoneIconSolid,
    description: 'Speech-to-Text services',
  },
  {
    name: 'Voice TTS',
    href: '/voice/tts',
    icon: SpeakerWaveIcon,
    iconSolid: SpeakerWaveIconSolid,
    description: 'Text-to-Speech services',
  },
  {
    name: 'AI Chat',
    href: '/chat',
    icon: ChatBubbleLeftRightIcon,
    iconSolid: ChatBubbleLeftRightIconSolid,
    description: 'AI-powered conversations',
    badge: 'New',
  },
  {
    name: 'Achievements',
    href: '/achievements',
    icon: TrophyIcon,
    iconSolid: TrophyIconSolid,
    description: 'Your progress and rewards',
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: CogIcon,
    iconSolid: CogIconSolid,
    description: 'Application settings',
  },
];

const secondaryNavigation = [
  {
    name: 'Help & Support',
    href: '/help',
    icon: QuestionMarkCircleIcon,
    description: 'Get help and support',
  },
];

export const Sidebar: React.FC = () => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  
  const { sidebarOpen, sidebarCollapsed, isMobile } = useAppSelector((state) => state.ui);
  const { user } = useAppSelector((state) => state.auth);
  const userLevel = useUserLevel();
  const userXP = useUserXP();
  const { profile } = useAppSelector((state) => state.gamification);
  
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const handleToggleCollapse = () => {
    if (!isMobile) {
      dispatch(setSidebarCollapsed(!sidebarCollapsed));
    }
  };

  const handleCloseSidebar = () => {
    if (isMobile) {
      dispatch(toggleSidebar());
    }
  };

  const isItemActive = (href: string) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  const canAccessItem = (item: NavigationItem) => {
    if (!item.requiredLevel) return true;
    return (userLevel?.current || 0) >= item.requiredLevel;
  };

  const sidebarClasses = cn(
    'fixed left-0 top-0 z-50 h-full bg-card border-r border-border transition-all duration-300 ease-in-out flex flex-col',
    {
      // Desktop states
      'w-64': !isMobile && sidebarOpen && !sidebarCollapsed,
      'w-16': !isMobile && sidebarOpen && sidebarCollapsed,
      'w-0 -translate-x-full': !isMobile && !sidebarOpen,
      
      // Mobile states
      'w-64 translate-x-0': isMobile && sidebarOpen,
      'w-64 -translate-x-full': isMobile && !sidebarOpen,
    }
  );

  if (!sidebarOpen && !isMobile) {
    return null;
  }

  return (
    <aside className={sidebarClasses}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {(!sidebarCollapsed || isMobile) && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">T2</span>
            </div>
            <div>
              <h1 className="font-semibold text-foreground">T2 Platform</h1>
              <p className="text-xs text-muted-foreground">AI-Powered HR</p>
            </div>
          </div>
        )}
        
        <div className="flex items-center space-x-1">
          {!isMobile && (
            <button
              onClick={handleToggleCollapse}
              className="p-1.5 rounded-md hover:bg-accent transition-colors"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRightIcon className="w-4 h-4" />
              ) : (
                <ChevronLeftIcon className="w-4 h-4" />
              )}
            </button>
          )}
          
          {isMobile && (
            <button
              onClick={handleCloseSidebar}
              className="p-1.5 rounded-md hover:bg-accent transition-colors"
              title="Close sidebar"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* User Info & Gamification */}
      {(!sidebarCollapsed || isMobile) && user && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <span className="text-primary-foreground font-medium">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>

          {/* Level & XP */}
          {userLevel && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <StarIcon className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium">Level {userLevel.current}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {userXP.available} XP
                </span>
              </div>
              
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${userLevel.progress * 100}%` }}
                />
              </div>
              
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{userLevel.xpForCurrent} XP</span>
                <span>{userLevel.xpForNext} XP</span>
              </div>
            </div>
          )}

          {/* Streak */}
          {profile?.streaks && profile.streaks.current > 0 && (
            <div className="flex items-center space-x-2 mt-3 p-2 bg-orange-500/10 rounded-md">
              <FireIcon className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                {profile.streaks.current} day streak!
              </span>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        <div className="px-2 space-y-1">
          {navigation.map((item) => {
            const isActive = isItemActive(item.href);
            const canAccess = canAccessItem(item);
            const Icon = isActive ? item.iconSolid : item.icon;
            
            const linkClasses = cn(
              'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200',
              {
                'bg-primary text-primary-foreground shadow-sm': isActive,
                'text-foreground hover:bg-accent hover:text-accent-foreground': !isActive && canAccess,
                'text-muted-foreground cursor-not-allowed opacity-50': !canAccess,
                'justify-center': sidebarCollapsed && !isMobile,
                'justify-start': !sidebarCollapsed || isMobile,
              }
            );

            const content = (
              <>
                <Icon className={cn('flex-shrink-0', {
                  'w-5 h-5': !sidebarCollapsed || isMobile,
                  'w-6 h-6': sidebarCollapsed && !isMobile,
                })} />
                
                {(!sidebarCollapsed || isMobile) && (
                  <>
                    <span className="ml-3 flex-1">{item.name}</span>
                    
                    {item.badge && (
                      <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                        {item.badge}
                      </span>
                    )}
                    
                    {item.comingSoon && (
                      <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded-full">
                        Soon
                      </span>
                    )}
                    
                    {!canAccess && item.requiredLevel && (
                      <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                        Lv.{item.requiredLevel}
                      </span>
                    )}
                  </>
                )}
              </>
            );

            if (!canAccess || item.comingSoon) {
              return (
                <div
                  key={item.name}
                  className={linkClasses}
                  title={
                    !canAccess 
                      ? `Requires level ${item.requiredLevel}` 
                      : item.comingSoon 
                      ? 'Coming soon' 
                      : item.description
                  }
                >
                  {content}
                </div>
              );
            }

            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={linkClasses}
                title={sidebarCollapsed && !isMobile ? item.name : item.description}
                onMouseEnter={() => setHoveredItem(item.name)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                {content}
              </NavLink>
            );
          })}
        </div>

        {/* Secondary Navigation */}
        <div className="mt-8 px-2 space-y-1">
          <div className={cn('px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider', {
            'text-center': sidebarCollapsed && !isMobile,
            'text-left': !sidebarCollapsed || isMobile,
          })}>
            {(!sidebarCollapsed || isMobile) ? 'Support' : '•••'}
          </div>
          
          {secondaryNavigation.map((item) => {
            const Icon = item.icon;
            
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={cn(
                  'group flex items-center px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200',
                  {
                    'justify-center': sidebarCollapsed && !isMobile,
                    'justify-start': !sidebarCollapsed || isMobile,
                  }
                )}
                title={sidebarCollapsed && !isMobile ? item.name : item.description}
              >
                <Icon className={cn('flex-shrink-0', {
                  'w-5 h-5': !sidebarCollapsed || isMobile,
                  'w-6 h-6': sidebarCollapsed && !isMobile,
                })} />
                
                {(!sidebarCollapsed || isMobile) && (
                  <span className="ml-3">{item.name}</span>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>

      {/* Tooltip for collapsed items */}
      {sidebarCollapsed && !isMobile && hoveredItem && (
        <div className="fixed left-20 bg-popover text-popover-foreground px-2 py-1 rounded-md shadow-lg text-sm z-50 pointer-events-none">
          {hoveredItem}
        </div>
      )}
    </aside>
  );
};

export default Sidebar;