import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AuthState, User } from '@/types/auth'

// Auth state — session managed via httpOnly cookies, not localStorage
const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isInitialized: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Called after GET /api/auth/me or POST /api/auth/login succeeds
    setCredentials: (state, action: PayloadAction<{ user: User; token?: string }>) => {
      state.user = action.payload.user
      state.token = action.payload.token || null
      state.isAuthenticated = true
      state.isInitialized = true
    },
    // Called on logout — cookie cleared by backend
    logout: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.isInitialized = true
    },
    // Called when GET /api/auth/me finishes (success or failure)
    setInitialized: (state) => {
      state.isInitialized = true
    },
  },
})

export const { setCredentials, logout, setInitialized } = authSlice.actions
export default authSlice.reducer
