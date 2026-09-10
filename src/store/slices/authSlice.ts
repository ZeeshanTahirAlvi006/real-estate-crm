import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AuthState, User } from '@/types/auth'

export const STORAGE_KEY_TOKEN = 'proppulse_access_token'
export const STORAGE_KEY_REFRESH = 'proppulse_refresh_token'
export const STORAGE_KEY_USER = 'proppulse_user'

const getInitialAuthState = (): AuthState => {
  if (typeof window === 'undefined') {
    return {
      user: null,
      token: null,
      isAuthenticated: false,
      isInitialized: false,
    }
  }

  try {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN)
    const userRaw = localStorage.getItem(STORAGE_KEY_USER)
    const user = userRaw ? JSON.parse(userRaw) : null

    if (token && user) {
      return {
        user,
        token,
        isAuthenticated: true,
        isInitialized: true,
      }
    }
  } catch {
    // Ignore storage parse errors
  }

  return {
    user: null,
    token: null,
    isAuthenticated: false,
    isInitialized: false,
  }
}

const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialAuthState(),
  reducers: {
    // Called after login, registration, or profile retrieval succeeds
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token?: string; refreshToken?: string }>
    ) => {
      state.user = action.payload.user
      state.token = action.payload.token || state.token || null
      state.isAuthenticated = true
      state.isInitialized = true

      if (typeof window !== 'undefined') {
        try {
          if (action.payload.token) {
            localStorage.setItem(STORAGE_KEY_TOKEN, action.payload.token)
          }
          if (action.payload.refreshToken) {
            localStorage.setItem(STORAGE_KEY_REFRESH, action.payload.refreshToken)
          }
          if (action.payload.user) {
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(action.payload.user))
          }
        } catch {
          // Ignore storage quota errors
        }
      }
    },
    // Called on logout
    logout: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.isInitialized = true

      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem(STORAGE_KEY_TOKEN)
          localStorage.removeItem(STORAGE_KEY_REFRESH)
          localStorage.removeItem(STORAGE_KEY_USER)
        } catch {
          // Ignore storage removal errors
        }
      }
    },
    // Called when session verification finishes
    setInitialized: (state) => {
      state.isInitialized = true
    },
  },
})

export const { setCredentials, logout, setInitialized } = authSlice.actions
export default authSlice.reducer

