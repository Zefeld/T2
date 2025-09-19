import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { 
  toggleSidebar, 
  toggleNotificationPanel, 
  setSearchQuery,
  toggleTheme,
} from '../../store/slices/uiSlice';
import { logout } from '../../store/slices/authSlice';
import { useUnreadNotifications } from '../../store/hooks';
import { cn } from '../../lib/utils';
import {
  Bars3Icon,
  MagnifyingGlassIcon,
  BellIcon,
  UserCircleIcon,
  SunIcon,
  MoonIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  CommandLineIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';
import { BellIcon as BellIconSolid } from '@heroicons/react/24/solid';

interface SearchResult {
  id: string;
  type: 'page' | 'user' | 'document' | 'action';
  title: string;
  description?: string;
  url: string;
  icon?: React.ComponentType<{ className?: string }>;
  category?: string;
}

const mockSearchResults: SearchResult[] = [
  {
    id: '1',
    type: 'page',
    title: 'Dashboard',
    description: 'Main dashboard with overview',
    url: '/',
    category: 'Navigation',
  },
  {
    id: '2',
    type: 'page',
    title: 'Analytics',
    description: 'HR analytics and insights',
    url: '/analytics',
    category: 'Navigation',
  },
  {
    id: '3',
    type: 'page',
    title: 'Voice STT',
    description: 'Speech-to-Text services',
    url: '/voice/stt',
    category: 'Navigation',
  },
  {
    id: '4',
    type: 'action',
    title: 'Toggle Theme',
    description: 'Switch between light and dark mode',
    url: '#toggle-theme',
    category: 'Actions',
  },
  {
    id: '5',
    type: 'action',
    title: 'Open Settings',
    description: 'Application settings and preferences',
    url: '/settings',
    category: 'Actions',
  },
];

export const Header: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  
  const { 
    sidebarOpen, 
    isMobile, 
    theme, 
    searchQuery,
    notificationPanelOpen,
  } = useAppSelector((state) => state.ui);
  const { user } = useAppSelector((state) => state.auth);
  const unreadCount = useUnreadNotifications();
  
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Handle search
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = mockSearchResults.filter(
        result =>
          result.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          result.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + K for command palette
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
      
      // Ctrl/Cmd + / for search
      if ((event.ctrlKey || event.metaKey) && event.key === '/') {
        event.preventDefault();
        const searchInput = document.getElementById('global-search') as HTMLInputElement;
        searchInput?.focus();
      }
      
      // Escape to close menus
      if (event.key === 'Escape') {
        setSearchFocused(false);
        setUserMenuOpen(false);
        setCommandPaletteOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchResultClick = (result: SearchResult) => {
    if (result.url === '#toggle-theme') {
      dispatch(toggleTheme());
    } else {
      navigate(result.url);
    }
    setSearchFocused(false);
    dispatch(setSearchQuery(''));
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleToggleTheme = () => {
    dispatch(toggleTheme());
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-7xl">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button */}
          <button
            onClick={() => dispatch(toggleSidebar())}
            className="p-2 rounded-md hover:bg-accent transition-colors lg:hidden"
            title="Toggle menu"
          >
            <Bars3Icon className="w-5 h-5" />
          </button>

          {/* Desktop Sidebar Toggle */}
          {!isMobile && (
            <button
              onClick={() => dispatch(toggleSidebar())}
              className="p-2 rounded-md hover:bg-accent transition-colors hidden lg:block"
              title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              <Bars3Icon className="w-5 h-5" />
            </button>
          )}

          {/* Search */}
          <div className="relative" ref={searchRef}>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="global-search"
                type="text"
                placeholder="Search... (Ctrl+/)"
                value={searchQuery}
                onChange={(e) => dispatch(setSearchQuery(e.target.value))}
                onFocus={() => setSearchFocused(true)}
                className={cn(
                  'pl-10 pr-4 py-2 bg-background border border-input rounded-md text-sm transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                  'placeholder:text-muted-foreground',
                  {
                    'w-64 lg:w-80': searchFocused || searchQuery,
                    'w-48 lg:w-64': !searchFocused && !searchQuery,
                  }
                )}
              />
            </div>

            {/* Search Results */}
            {searchFocused && (searchResults.length > 0 || searchQuery) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
                {searchResults.length > 0 ? (
                  <div className="py-2">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleSearchResultClick(result)}
                        className="w-full px-4 py-2 text-left hover:bg-accent transition-colors flex items-center space-x-3"
                      >
                        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                          {result.icon ? (
                            <result.icon className="w-4 h-4" />
                          ) : (
                            <span className="text-xs font-medium">
                              {result.type === 'page' ? 'P' : result.type === 'user' ? 'U' : 'A'}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{result.title}</p>
                          {result.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {result.description}
                            </p>
                          )}
                        </div>
                        {result.category && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                            {result.category}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    <MagnifyingGlassIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No results found for "{searchQuery}"</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2">
          {/* Command Palette */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="p-2 rounded-md hover:bg-accent transition-colors hidden lg:block"
            title="Command palette (Ctrl+K)"
          >
            <CommandLineIcon className="w-5 h-5" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={handleToggleTheme}
            className="p-2 rounded-md hover:bg-accent transition-colors"
            title={`Switch to ${theme.mode === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme.mode === 'light' ? (
              <MoonIcon className="w-5 h-5" />
            ) : (
              <SunIcon className="w-5 h-5" />
            )}
          </button>

          {/* Help */}
          <button
            onClick={() => navigate('/help')}
            className="p-2 rounded-md hover:bg-accent transition-colors"
            title="Help & Support"
          >
            <QuestionMarkCircleIcon className="w-5 h-5" />
          </button>

          {/* Notifications */}
          <button
            onClick={() => dispatch(toggleNotificationPanel())}
            className={cn(
              'relative p-2 rounded-md transition-colors',
              {
                'bg-accent': notificationPanelOpen,
                'hover:bg-accent': !notificationPanelOpen,
              }
            )}
            title="Notifications"
          >
            {unreadCount > 0 ? (
              <BellIconSolid className="w-5 h-5 text-primary" />
            ) : (
              <BellIcon className="w-5 h-5" />
            )}
            
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-medium rounded-full flex items-center justify-center">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* User Menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent transition-colors"
              title="User menu"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <UserCircleIcon className="w-6 h-6" />
              )}
              
              {!isMobile && (
                <span className="text-sm font-medium hidden sm:block">
                  {user?.name || 'User'}
                </span>
              )}
            </button>

            {/* User Dropdown */}
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-popover border border-border rounded-md shadow-lg z-50">
                <div className="py-2">
                  {/* User Info */}
                  <div className="px-4 py-2 border-b border-border">
                    <p className="font-medium text-sm">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>

                  {/* Menu Items */}
                  <button
                    onClick={() => {
                      navigate('/profile');
                      setUserMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center space-x-2"
                  >
                    <UserCircleIcon className="w-4 h-4" />
                    <span>Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      navigate('/settings');
                      setUserMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center space-x-2"
                  >
                    <CogIcon className="w-4 h-4" />
                    <span>Settings</span>
                  </button>

                  <div className="border-t border-border my-1" />

                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center space-x-2 text-destructive"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Command Palette Modal */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20">
          <div className="bg-popover border border-border rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="p-4 border-b border-border">
              <div className="relative">
                <CommandLineIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Type a command or search..."
                  className="w-full pl-10 pr-4 py-2 bg-transparent border-none outline-none text-sm"
                  autoFocus
                />
              </div>
            </div>
            
            <div className="p-2 max-h-96 overflow-y-auto">
              {mockSearchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => {
                    handleSearchResultClick(result);
                    setCommandPaletteOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-accent rounded-md transition-colors flex items-center space-x-3"
                >
                  <div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
                    <span className="text-xs font-medium">
                      {result.type === 'page' ? 'P' : result.type === 'user' ? 'U' : 'A'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{result.title}</p>
                    {result.description && (
                      <p className="text-xs text-muted-foreground">{result.description}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
            
            <div className="p-3 border-t border-border text-xs text-muted-foreground">
              Press <kbd className="px-1 py-0.5 bg-muted rounded">Esc</kbd> to close
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;