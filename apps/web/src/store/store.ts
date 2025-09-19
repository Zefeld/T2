import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { authApi } from './api/authApi';
import { userApi } from './api/userApi';
import { voiceApi } from './api/voiceApi';
import { llmApi } from './api/llmApi';
import { analyticsApi } from './api/analyticsApi';
import { gamificationApi } from './api/gamificationApi';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import notificationReducer from './slices/notificationSlice';
import voiceReducer from './slices/voiceSlice';

// Configure the Redux store
export const store = configureStore({
  reducer: {
    // API slices
    [authApi.reducerPath]: authApi.reducer,
    [userApi.reducerPath]: userApi.reducer,
    [voiceApi.reducerPath]: voiceApi.reducer,
    [llmApi.reducerPath]: llmApi.reducer,
    [analyticsApi.reducerPath]: analyticsApi.reducer,
    [gamificationApi.reducerPath]: gamificationApi.reducer,
    
    // Regular slices
    auth: authReducer,
    ui: uiReducer,
    notifications: notificationReducer,
    voice: voiceReducer,
  },
  
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/PURGE',
          'persist/REGISTER',
        ],
        // Ignore these field paths in all actions
        ignoredActionsPaths: ['meta.arg', 'payload.timestamp'],
        // Ignore these paths in the state
        ignoredPaths: ['items.dates'],
      },
    })
      .concat(authApi.middleware)
      .concat(userApi.middleware)
      .concat(voiceApi.middleware)
      .concat(llmApi.middleware)
      .concat(analyticsApi.middleware)
      .concat(gamificationApi.middleware),
  
  devTools: process.env.NODE_ENV !== 'production',
});

// Setup listeners for RTK Query
setupListeners(store.dispatch);

// Export types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Export hooks
export { useAppDispatch, useAppSelector } from './hooks';