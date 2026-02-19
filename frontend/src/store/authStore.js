import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      users: [],
      isAuthenticated: false,

      // Admin Step 1: Verify PIN and get user list
      verifyPin: async (pin) => {
        try {
          const res = await api.post('/auth/login', { pin });
          if (res.data.success && res.data.users) {
            set({ users: res.data.users });
            return { success: true, users: res.data.users };
          }
           // Fallback if success is true but users is missing (unlikely based on controller)
          if (res.data.success) {
             return { success: true };
          }
          return { success: false, error: res.data.message || 'Unexpected response' };
        } catch (error) {
          return {
            success: false,
            error: error.message || 'Invalid PIN',
          };
        }
      },

      // Admin Step 2: Login as selected user
      login: async (pin, userId) => {
        try {
          const res = await api.post('/auth/login', { pin, userId });
          if (res.data.success) {
            const { user, token } = res.data;
            // No refresh token from backend currently
            set({ user, token, refreshToken: null, isAuthenticated: true });
            return { success: true };
          }
          return { success: false, error: res.data.message || 'Login failed' };
        } catch (error) {
          return {
            success: false,
            error: error.message || 'Login failed',
          };
        }
      },

      // Employee login with email + password
      employeeLogin: async (email, password) => {
        try {
          const res = await api.post('/auth/employee-login', { email, password });
          if (res.data.success) {
            const { user, token } = res.data;
            set({ user, token, refreshToken: null, isAuthenticated: true });
            return { success: true };
          }
           return { success: false, error: res.data.message || 'Login failed' };
        } catch (error) {
          return {
            success: false,
            error: error.message || 'Login failed',
          };
        }
      },

      // Refresh the access token (Simplified for now - just returns false as backend has no refresh ep)
      refreshAccessToken: async () => {
        // Backend hardening phase removed explicit refresh token flow for now.
        // Relying on 1-day access token.
        return false; 
      },

      logout: async () => {
        try {
          // No server-side logout needed for JWT without refresh tokens
          // But kept for future extensibility
          // await api.post('/auth/logout').catch(() => {});
        } finally {
          set({ user: null, token: null, refreshToken: null, users: [], isAuthenticated: false });
          localStorage.removeItem('auth-storage');
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);
