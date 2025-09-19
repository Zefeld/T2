import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { toggleSidebar, setMobileView, toggleNotificationPanel } from '../../store/slices/uiSlice';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { NotificationPanel } from '../Notifications/NotificationPanel';
import { RewardModal } from '../Gamification/RewardModal';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { ErrorBoundary } from '../UI/ErrorBoundary';
import { cn } from '../../lib/utils';

interface LayoutProps {
  children?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const dispatch = useAppDispatch();
  const location = useLocation();
  
  const {
    sidebarOpen,
    sidebarCollapsed,
    isMobile,
    notificationPanelOpen,
    theme,
    layout,
    loading,
  } = useAppSelector((state) => state.ui);
  
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { showRewardModal } = useAppSelector((state) => state.gamification);
  
  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      dispatch(setMobileView(mobile));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [dispatch]);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      dispatch(toggleSidebar());
    }
  }, [location.pathname, isMobile, sidebarOpen, dispatch]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + B to toggle sidebar
      if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
        event.preventDefault();
        dispatch(toggleSidebar());
      }
      
      // Ctrl/Cmd + Shift + N to toggle notifications
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'N') {
        event.preventDefault();
        dispatch(toggleNotificationPanel());
      }
      
      // Escape to close panels
      if (event.key === 'Escape') {
        if (notificationPanelOpen) {
          dispatch(toggleNotificationPanel());
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, notificationPanelOpen]);

  // Don't render layout for unauthenticated users on protected routes
  if (!isAuthenticated && location.pathname !== '/login' && location.pathname !== '/register') {
    return null;
  }

  // Show loading spinner for global loading states
  if (loading.global) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const layoutClasses = cn(
    'min-h-screen bg-background transition-colors duration-200',
    {
      'dark': theme.mode === 'dark',
      'high-contrast': theme.accessibility.highContrast,
      'reduced-motion': theme.accessibility.reducedMotion,
    }
  );

  const mainClasses = cn(
    'flex-1 flex flex-col transition-all duration-300 ease-in-out',
    {
      // Desktop sidebar states
      'ml-64': !isMobile && sidebarOpen && !sidebarCollapsed,
      'ml-16': !isMobile && sidebarOpen && sidebarCollapsed,
      'ml-0': !isMobile && !sidebarOpen,
      
      // Mobile states
      'ml-0': isMobile,
    }
  );

  const contentClasses = cn(
    'flex-1 transition-all duration-300 ease-in-out',
    {
      'mr-80': notificationPanelOpen && !isMobile,
      'mr-0': !notificationPanelOpen || isMobile,
    }
  );

  return (
    <ErrorBoundary>
      <div className={layoutClasses}>
        {/* Sidebar */}
        {isAuthenticated && (
          <Sidebar />
        )}

        {/* Main Content Area */}
        <div className={mainClasses}>
          {/* Header */}
          {isAuthenticated && (
            <Header />
          )}

          {/* Page Content */}
          <main className={contentClasses}>
            <div className="container mx-auto px-4 py-6 max-w-7xl">
              <ErrorBoundary>
                {children || <Outlet />}
              </ErrorBoundary>
            </div>
          </main>

          {/* Footer */}
          {isAuthenticated && layout.showFooter && (
            <footer className="border-t bg-card/50 backdrop-blur-sm">
              <div className="container mx-auto px-4 py-4 max-w-7xl">
                <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground">
                  <div className="flex items-center space-x-4">
                    <span>© 2024 T2 Platform</span>
                    <span>•</span>
                    <a href="/privacy" className="hover:text-foreground transition-colors">
                      Privacy Policy
                    </a>
                    <span>•</span>
                    <a href="/terms" className="hover:text-foreground transition-colors">
                      Terms of Service
                    </a>
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-2 sm:mt-0">
                    <span>Version 1.0.0</span>
                    <span>•</span>
                    <a 
                      href="/help" 
                      className="hover:text-foreground transition-colors"
                    >
                      Help & Support
                    </a>
                  </div>
                </div>
              </div>
            </footer>
          )}
        </div>

        {/* Notification Panel */}
        {isAuthenticated && (
          <NotificationPanel />
        )}

        {/* Mobile Sidebar Overlay */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => dispatch(toggleSidebar())}
          />
        )}

        {/* Notification Panel Overlay (Mobile) */}
        {isMobile && notificationPanelOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            onClick={() => dispatch(toggleNotificationPanel())}
          />
        )}

        {/* Reward Modal */}
        {showRewardModal && (
          <RewardModal />
        )}

        {/* Global Loading Overlay */}
        {loading.overlay && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-card p-6 rounded-lg shadow-lg">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-center text-muted-foreground">
                {loading.message || 'Loading...'}
              </p>
            </div>
          </div>
        )}

        {/* Accessibility Announcements */}
        <div
          id="accessibility-announcements"
          className="sr-only"
          aria-live="polite"
          aria-atomic="true"
        />

        {/* Skip Links */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded-md z-50"
        >
          Skip to main content
        </a>
      </div>
    </ErrorBoundary>
  );
};

export default Layout;