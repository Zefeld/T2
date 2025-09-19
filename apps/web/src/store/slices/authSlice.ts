import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../api/authApi';

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiry: number | null;
  permissions: string[];
  roles: string[];
  sessionId: string | null;
  lastActivity: number | null;
  loginAttempts: number;
  isLocked: boolean;
  lockExpiry: number | null;
  twoFactorRequired: boolean;
  twoFactorToken: string | null;
  rememberMe: boolean;
  loginRedirect: string | null;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  accessToken: localStorage.getItem('access_token'),
  refreshToken: localStorage.getItem('refresh_token'),
  tokenExpiry: localStorage.getItem('token_expiry') 
    ? parseInt(localStorage.getItem('token_expiry')!) 
    : null,
  permissions: [],
  roles: [],
  sessionId: localStorage.getItem('session_id'),
  lastActivity: Date.now(),
  loginAttempts: parseInt(localStorage.getItem('login_attempts') || '0'),
  isLocked: false,
  lockExpiry: localStorage.getItem('lock_expiry') 
    ? parseInt(localStorage.getItem('lock_expiry')!) 
    : null,
  twoFactorRequired: false,
  twoFactorToken: null,
  rememberMe: localStorage.getItem('remember_me') === 'true',
  loginRedirect: null,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Authentication actions
    loginStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    
    loginSuccess: (state, action: PayloadAction<{
      user: User;
      accessToken: string;
      refreshToken: string;
      tokenExpiry: number;
      sessionId: string;
      permissions: string[];
      roles: string[];
    }>) => {
      const { user, accessToken, refreshToken, tokenExpiry, sessionId, permissions, roles } = action.payload;
      
      state.isAuthenticated = true;
      state.isLoading = false;
      state.user = user;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.tokenExpiry = tokenExpiry;
      state.sessionId = sessionId;
      state.permissions = permissions;
      state.roles = roles;
      state.lastActivity = Date.now();
      state.loginAttempts = 0;
      state.isLocked = false;
      state.lockExpiry = null;
      state.twoFactorRequired = false;
      state.twoFactorToken = null;
      state.error = null;
      
      // Persist to localStorage
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      localStorage.setItem('token_expiry', tokenExpiry.toString());
      localStorage.setItem('session_id', sessionId);
      localStorage.removeItem('login_attempts');
      localStorage.removeItem('lock_expiry');
    },
    
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
      state.loginAttempts += 1;
      
      // Lock account after 5 failed attempts
      if (state.loginAttempts >= 5) {
        state.isLocked = true;
        state.lockExpiry = Date.now() + (15 * 60 * 1000); // 15 minutes
        localStorage.setItem('lock_expiry', state.lockExpiry.toString());
      }
      
      localStorage.setItem('login_attempts', state.loginAttempts.toString());
    },
    
    twoFactorRequired: (state, action: PayloadAction<string>) => {
      state.twoFactorRequired = true;
      state.twoFactorToken = action.payload;
      state.isLoading = false;
    },
    
    logout: (state) => {
      state.isAuthenticated = false;
      state.isLoading = false;
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.tokenExpiry = null;
      state.permissions = [];
      state.roles = [];
      state.sessionId = null;
      state.twoFactorRequired = false;
      state.twoFactorToken = null;
      state.error = null;
      
      // Clear localStorage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token_expiry');
      localStorage.removeItem('session_id');
      
      // Keep remember me and login attempts for security
      if (!state.rememberMe) {
        localStorage.removeItem('remember_me');
      }
    },
    
    // Token management
    tokenRefreshed: (state, action: PayloadAction<{
      accessToken: string;
      tokenExpiry: number;
    }>) => {
      const { accessToken, tokenExpiry } = action.payload;
      state.accessToken = accessToken;
      state.tokenExpiry = tokenExpiry;
      state.lastActivity = Date.now();
      
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('token_expiry', tokenExpiry.toString());
    },
    
    tokenExpired: (state) => {
      state.isAuthenticated = false;
      state.accessToken = null;
      state.tokenExpiry = null;
      state.error = 'Session expired. Please log in again.';
      
      localStorage.removeItem('access_token');
      localStorage.removeItem('token_expiry');
    },
    
    // User profile updates
    userUpdated: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    
    // Permissions and roles
    permissionsUpdated: (state, action: PayloadAction<string[]>) => {
      state.permissions = action.payload;
    },
    
    rolesUpdated: (state, action: PayloadAction<string[]>) => {
      state.roles = action.payload;
    },
    
    // Session management
    sessionUpdated: (state, action: PayloadAction<{
      sessionId: string;
      lastActivity: number;
    }>) => {
      state.sessionId = action.payload.sessionId;
      state.lastActivity = action.payload.lastActivity;
      
      localStorage.setItem('session_id', action.payload.sessionId);
    },
    
    activityUpdated: (state) => {
      state.lastActivity = Date.now();
    },
    
    // Account security
    accountUnlocked: (state) => {
      state.isLocked = false;
      state.lockExpiry = null;
      state.loginAttempts = 0;
      
      localStorage.removeItem('lock_expiry');
      localStorage.removeItem('login_attempts');
    },
    
    // Settings
    rememberMeToggled: (state, action: PayloadAction<boolean>) => {
      state.rememberMe = action.payload;
      
      if (action.payload) {
        localStorage.setItem('remember_me', 'true');
      } else {
        localStorage.removeItem('remember_me');
      }
    },
    
    // Navigation
    setLoginRedirect: (state, action: PayloadAction<string | null>) => {
      state.loginRedirect = action.payload;
    },
    
    clearLoginRedirect: (state) => {
      state.loginRedirect = null;
    },
    
    // Error handling
    clearError: (state) => {
      state.error = null;
    },
    
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
    },
    
    // Loading states
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    
    // Initialize auth state (on app startup)
    initializeAuth: (state) => {
      const now = Date.now();
      
      // Check if account is locked
      if (state.lockExpiry && now < state.lockExpiry) {
        state.isLocked = true;
      } else if (state.lockExpiry && now >= state.lockExpiry) {
        state.isLocked = false;
        state.lockExpiry = null;
        state.loginAttempts = 0;
        localStorage.removeItem('lock_expiry');
        localStorage.removeItem('login_attempts');
      }
      
      // Check token expiry
      if (state.tokenExpiry && now >= state.tokenExpiry) {
        state.isAuthenticated = false;
        state.accessToken = null;
        state.tokenExpiry = null;
        localStorage.removeItem('access_token');
        localStorage.removeItem('token_expiry');
      } else if (state.accessToken && state.tokenExpiry) {
        state.isAuthenticated = true;
      }
      
      state.isLoading = false;
    },
  },
});

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  twoFactorRequired,
  logout,
  tokenRefreshed,
  tokenExpired,
  userUpdated,
  permissionsUpdated,
  rolesUpdated,
  sessionUpdated,
  activityUpdated,
  accountUnlocked,
  rememberMeToggled,
  setLoginRedirect,
  clearLoginRedirect,
  clearError,
  setError,
  setLoading,
  initializeAuth,
} = authSlice.actions;

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectUserRoles = (state: { auth: AuthState }) => state.auth.roles;
export const selectUserPermissions = (state: { auth: AuthState }) => state.auth.permissions;
export const selectIsLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
export const selectIsLocked = (state: { auth: AuthState }) => state.auth.isLocked;
export const selectTwoFactorRequired = (state: { auth: AuthState }) => state.auth.twoFactorRequired;
export const selectLoginRedirect = (state: { auth: AuthState }) => state.auth.loginRedirect;

// Helper selectors
export const selectHasRole = (role: string) => (state: { auth: AuthState }) => 
  state.auth.roles.includes(role);

export const selectHasPermission = (permission: string) => (state: { auth: AuthState }) => 
  state.auth.permissions.includes(permission);

export const selectHasAnyRole = (roles: string[]) => (state: { auth: AuthState }) => 
  roles.some(role => state.auth.roles.includes(role));

export const selectHasAnyPermission = (permissions: string[]) => (state: { auth: AuthState }) => 
  permissions.some(permission => state.auth.permissions.includes(permission));

export const selectTokenExpiresIn = (state: { auth: AuthState }) => {
  if (!state.auth.tokenExpiry) return null;
  const expiresIn = state.auth.tokenExpiry - Date.now();
  return expiresIn > 0 ? expiresIn : 0;
};

export const selectIsTokenExpiringSoon = (state: { auth: AuthState }) => {
  const expiresIn = selectTokenExpiresIn(state);
  return expiresIn !== null && expiresIn < 5 * 60 * 1000; // 5 minutes
};

export default authSlice.reducer;