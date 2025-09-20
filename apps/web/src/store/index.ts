import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { combineReducers } from '@reduxjs/toolkit';

// API slices
import { authApi } from './api/authApi';
import { userApi } from './api/userApi';
import { voiceApi } from './api/voiceApi';
import { analyticsApi } from './api/analyticsApi';
import { gamificationApi } from './api/gamificationApi';

// Regular slices
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import notificationsReducer from './slices/notificationsSlice';
import gamificationReducer from './slices/gamificationSlice';

// Persist configuration
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'ui', 'gamification'], // Only persist these slices
  blacklist: ['notifications'], // Don't persist notifications
};

const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['user', 'tokens', 'preferences'], // Only persist essential auth data
  blacklist: ['isLoading', 'error'], // Don't persist loading/error states
};

const uiPersistConfig = {
  key: 'ui',
  storage,
  whitelist: ['theme', 'layout', 'preferences', 'language'], // Persist UI preferences
  blacklist: ['loading', 'modals', 'notifications', 'errors'], // Don't persist temporary states
};

const gamificationPersistConfig = {
  key: 'gamification',
  storage,
  whitelist: ['profile', 'recentRewards'], // Persist user progress
  blacklist: ['isLoading', 'error', 'websocketConnected'], // Don't persist temporary states
};

// Combine reducers
const rootReducer = combineReducers({
  // API reducers
  [authApi.reducerPath]: authApi.reducer,
  [userApi.reducerPath]: userApi.reducer,
  [voiceApi.reducerPath]: voiceApi.reducer,
  [analyticsApi.reducerPath]: analyticsApi.reducer,
  [gamificationApi.reducerPath]: gamificationApi.reducer,
  
  // Regular reducers with persistence
  auth: persistReducer(authPersistConfig, authReducer),
  ui: persistReducer(uiPersistConfig, uiReducer),
  gamification: persistReducer(gamificationPersistConfig, gamificationReducer),
  
  // Non-persisted reducers
  notifications: notificationsReducer,
});

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/FLUSH',
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/PERSIST',
          'persist/PURGE',
          'persist/REGISTER',
        ],
      },
    })
      .concat(authApi.middleware)
      .concat(userApi.middleware)
      .concat(voiceApi.middleware)
      .concat(analyticsApi.middleware)
      .concat(gamificationApi.middleware),
  
  devTools: process.env.NODE_ENV !== 'production',
});

// Setup listeners for RTK Query
setupListeners(store.dispatch);

// Create persistor
export const persistor = persistStore(store);

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export hooks
export { useAppDispatch, useAppSelector } from './hooks';

// Export API hooks
export * from './api/authApi';
export * from './api/userApi';
export * from './api/voiceApi';
export * from './api/analyticsApi';
export * from './api/gamificationApi';

// Export slice actions
export * from './slices/authSlice';
export * from './slices/uiSlice';
export * from './slices/notificationsSlice';
export * from './slices/gamificationSlice';

// Store utilities
export const resetStore = () => {
  persistor.purge();
  store.dispatch({ type: 'RESET_STORE' });
};

export const clearCache = () => {
  store.dispatch(authApi.util.resetApiState());
  store.dispatch(userApi.util.resetApiState());
  store.dispatch(voiceApi.util.resetApiState());
  store.dispatch(analyticsApi.util.resetApiState());
  store.dispatch(gamificationApi.util.resetApiState());
};

// Development utilities
if (process.env.NODE_ENV === 'development') {
  // @ts-ignore
  window.__REDUX_STORE__ = store;
  // @ts-ignore
  window.__REDUX_PERSISTOR__ = persistor;
}

export default store;