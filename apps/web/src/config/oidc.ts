import { UserManagerSettings } from 'oidc-client-ts';

// Environment variables with defaults
const getEnvVar = (name: string, defaultValue?: string): string => {
  const value = process.env[name] || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
};

// OIDC Configuration
export const oidcConfig: UserManagerSettings = {
  // OIDC Provider settings
  authority: getEnvVar('REACT_APP_OIDC_AUTHORITY', 'https://your-oidc-provider.com'),
  client_id: getEnvVar('REACT_APP_OIDC_CLIENT_ID', 'career-development-web'),
  
  // Redirect URIs
  redirect_uri: getEnvVar('REACT_APP_OIDC_REDIRECT_URI', `${window.location.origin}/auth/callback`),
  post_logout_redirect_uri: getEnvVar('REACT_APP_OIDC_POST_LOGOUT_REDIRECT_URI', window.location.origin),
  silent_redirect_uri: getEnvVar('REACT_APP_OIDC_SILENT_REDIRECT_URI', `${window.location.origin}/auth/silent-callback`),
  
  // OAuth2/OIDC settings
  response_type: 'code',
  scope: 'openid profile email',
  
  // PKCE (Proof Key for Code Exchange) - recommended for SPAs
  response_mode: 'query',
  
  // Token management
  automaticSilentRenew: true,
  silent_redirect_uri: `${window.location.origin}/auth/silent-callback`,
  accessTokenExpiringNotificationTime: 60, // 1 minute before expiry
  
  // Security settings
  filterProtocolClaims: true,
  loadUserInfo: true,
  
  // Metadata settings
  metadata: {
    issuer: getEnvVar('REACT_APP_OIDC_AUTHORITY', 'https://your-oidc-provider.com'),
    authorization_endpoint: `${getEnvVar('REACT_APP_OIDC_AUTHORITY', 'https://your-oidc-provider.com')}/auth`,
    token_endpoint: `${getEnvVar('REACT_APP_OIDC_AUTHORITY', 'https://your-oidc-provider.com')}/token`,
    userinfo_endpoint: `${getEnvVar('REACT_APP_OIDC_AUTHORITY', 'https://your-oidc-provider.com')}/userinfo`,
    end_session_endpoint: `${getEnvVar('REACT_APP_OIDC_AUTHORITY', 'https://your-oidc-provider.com')}/logout`,
    jwks_uri: `${getEnvVar('REACT_APP_OIDC_AUTHORITY', 'https://your-oidc-provider.com')}/.well-known/jwks.json`,
    
    // Supported features
    grant_types_supported: ['authorization_code', 'refresh_token'],
    response_types_supported: ['code'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
    scopes_supported: ['openid', 'profile', 'email'],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    claims_supported: [
      'sub',
      'iss',
      'aud',
      'exp',
      'iat',
      'auth_time',
      'nonce',
      'email',
      'email_verified',
      'name',
      'given_name',
      'family_name',
      'picture',
      'locale'
    ],
    code_challenge_methods_supported: ['S256']
  },
  
  // Client settings
  client: {
    client_id: getEnvVar('REACT_APP_OIDC_CLIENT_ID', 'career-development-web'),
    client_secret: process.env.REACT_APP_OIDC_CLIENT_SECRET, // Optional for public clients
  },
  
  // Additional settings
  extraQueryParams: {},
  extraTokenParams: {},
  
  // Logging (only in development)
  ...(process.env.NODE_ENV === 'development' && {
    userStore: undefined, // Use default session storage
    stateStore: undefined, // Use default session storage
  }),
};

// Helper function to get the current user's return URL
export const getReturnUrl = (): string => {
  const params = new URLSearchParams(window.location.search);
  const returnUrl = params.get('returnUrl');
  
  if (returnUrl) {
    try {
      // Validate the return URL
      const url = new URL(returnUrl, window.location.origin);
      
      // Only allow same-origin URLs for security
      if (url.origin === window.location.origin) {
        return returnUrl;
      }
    } catch (error) {
      console.warn('Invalid return URL:', returnUrl);
    }
  }
  
  return '/dashboard';
};

// Helper function to initiate login with return URL
export const initiateLogin = (returnUrl?: string): void => {
  const loginUrl = new URL('/auth/login', window.location.origin);
  
  if (returnUrl) {
    loginUrl.searchParams.set('returnUrl', returnUrl);
  }
  
  window.location.href = loginUrl.toString();
};

// Helper function to initiate logout
export const initiateLogout = (allDevices: boolean = false): void => {
  const logoutUrl = new URL('/auth/logout', window.location.origin);
  
  if (allDevices) {
    logoutUrl.searchParams.set('allDevices', 'true');
  }
  
  window.location.href = logoutUrl.toString();
};

// OIDC scopes and their descriptions
export const OIDC_SCOPES = {
  openid: 'Required for OIDC authentication',
  profile: 'Access to user profile information (name, picture, etc.)',
  email: 'Access to user email address',
  offline_access: 'Access to refresh tokens for offline access',
} as const;

// User roles and their permissions
export const USER_ROLES = {
  admin: {
    name: 'Administrator',
    permissions: [
      'users:read', 'users:write', 'users:delete',
      'profiles:read', 'profiles:write', 'profiles:delete',
      'analytics:read', 'analytics:write',
      'system:admin', 'audit:read',
      'voice:stt', 'voice:tts',
      'llm:chat', 'llm:embeddings'
    ]
  },
  hr_manager: {
    name: 'HR Manager',
    permissions: [
      'users:read', 'users:write',
      'profiles:read', 'profiles:write',
      'analytics:read', 'jobs:write',
      'voice:stt', 'voice:tts',
      'llm:chat', 'llm:embeddings'
    ]
  },
  hr_specialist: {
    name: 'HR Specialist',
    permissions: [
      'users:read', 'profiles:read',
      'analytics:read', 'jobs:read',
      'voice:stt', 'voice:tts',
      'llm:chat'
    ]
  },
  team_lead: {
    name: 'Team Lead',
    permissions: [
      'users:read', 'profiles:read',
      'team:manage', 'feedback:write',
      'voice:stt', 'voice:tts',
      'llm:chat'
    ]
  },
  employee: {
    name: 'Employee',
    permissions: [
      'profiles:read', 'profiles:write:own',
      'courses:read', 'courses:enroll',
      'recommendations:read', 'jobs:apply',
      'gamification:read',
      'voice:stt', 'voice:tts',
      'llm:chat'
    ]
  }
} as const;

export type UserRole = keyof typeof USER_ROLES;
export type Permission = typeof USER_ROLES[UserRole]['permissions'][number];

// Helper function to check if user has permission
export const hasPermission = (userRole: UserRole, permission: Permission): boolean => {
  return USER_ROLES[userRole]?.permissions.includes(permission) || false;
};

// Helper function to get user permissions
export const getUserPermissions = (userRole: UserRole): Permission[] => {
  return USER_ROLES[userRole]?.permissions || [];
};

// API endpoints
export const API_ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    callback: '/api/auth/callback',
    logout: '/api/auth/logout',
    refresh: '/api/auth/refresh',
    me: '/api/auth/me',
  },
  users: {
    list: '/api/users',
    profile: '/api/users/profile',
    update: '/api/users/profile',
  },
  voice: {
    stt: '/api/voice/stt',
    tts: '/api/voice/tts',
  },
  llm: {
    chat: '/api/llm/chat',
    embeddings: '/api/llm/embeddings',
  },
  analytics: {
    dashboard: '/api/analytics/dashboard',
    reports: '/api/analytics/reports',
  },
  gamification: {
    profile: '/api/gamification/profile',
    leaderboard: '/api/gamification/leaderboard',
    achievements: '/api/gamification/achievements',
  },
} as const;