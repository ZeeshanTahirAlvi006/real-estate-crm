import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface UiState {
  sidebarCollapsed: boolean
  globalSearchQuery: string
}

const initialState: UiState = {
  sidebarCollapsed: false,
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
    setGlobalSearchQuery: (state, action: PayloadAction<string>) => {
      state.globalSearchQuery = action.payload
    },
  },
})

export const { toggleSidebar, setSidebarCollapsed, setGlobalSearchQuery } = uiSlice.actions
export default uiSlice.reducer
