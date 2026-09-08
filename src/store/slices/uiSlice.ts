import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface UiState {
  sidebarCollapsed: boolean
  sidebarDrawerOpen: boolean
  globalSearchQuery: string
}

const initialState: UiState = {
  sidebarCollapsed: false,
  sidebarDrawerOpen: false,
  globalSearchQuery: '',
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload
    },
    toggleSidebarDrawer: (state) => {
      state.sidebarDrawerOpen = !state.sidebarDrawerOpen
    },
    setSidebarDrawerOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarDrawerOpen = action.payload
    },
    setGlobalSearchQuery: (state, action: PayloadAction<string>) => {
      state.globalSearchQuery = action.payload
    },
  },
})

export const {
  toggleSidebar,
  setSidebarCollapsed,
  toggleSidebarDrawer,
  setSidebarDrawerOpen,
  setGlobalSearchQuery,
} = uiSlice.actions
export default uiSlice.reducer
