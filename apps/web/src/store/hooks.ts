import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './index';

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Custom hooks for common patterns
export const useAuth = () => {
  return useAppSelector((state) => state.auth);
};

export const useUI = () => {
  return useAppSelector((state) => state.ui);
};

export const useNotifications = () => {
  return useAppSelector((state) => state.notifications);
};

export const useGamification = () => {
  return useAppSelector((state) => state.gamification);
};

// Specific selectors
export const useCurrentUser = () => {
  return useAppSelector((state) => state.auth.user);
};

export const useIsAuthenticated = () => {
  return useAppSelector((state) => state.auth.isAuthenticated);
};

export const useTheme = () => {
  return useAppSelector((state) => state.ui.theme);
};

export const useLayout = () => {
  return useAppSelector((state) => state.ui.layout);
};

export const useUnreadNotifications = () => {
  return useAppSelector((state) => state.notifications.unreadCount);
};

export const useUserLevel = () => {
  return useAppSelector((state) => state.gamification.profile?.level);
};

export const useUserXP = () => {
  return useAppSelector((state) => ({
    total: state.gamification.profile?.totalXP || 0,
    available: state.gamification.profile?.availableXP || 0,
    spent: state.gamification.profile?.spentXP || 0,
  }));
};