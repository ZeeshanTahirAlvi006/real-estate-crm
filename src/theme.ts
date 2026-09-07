/**
 * Application Theme Configuration
 * 
 * Strict Plain / Solid Color Palette (No gradients, no linear coloring):
 * - #9CB080 : Sage Green (Primary accent, CTA buttons, active highlights)
 * - #618764 : Olive Forest Green (Borders, secondary accents, badges)
 * - #2B5748 : Deep Pine Green (Card surfaces, containers, dark buttons)
 * - #273338 : Dark Charcoal Slate (Primary dark background)
 */

export const themeColors = {
  // User Core 4-Color Palette
  sage: '#9CB080',
  forest: '#618764',
  pine: '#2B5748',
  charcoal: '#273338',

  // Semantic Aliases
  accent: '#9CB080',
  borderDark: '#618764',
  surfaceDark: '#2B5748',
  bgDark: '#273338',

  // Light Palette
  lightBg: '#F5F7F4',
  lightCard: '#FFFFFF',
  lightSubCard: '#EDF2EB',
  lightBorder: '#D8E2D6',
  lightText: '#273338',
  lightTextSecondary: '#4A5D54',
  lightTextMuted: '#75887E',

  // Dark Palette
  darkBg: '#273338',
  darkCard: '#2B5748',
  darkSubCard: '#202B2F',
  darkBorder: '#618764',
  darkText: '#FFFFFF',
  darkTextSecondary: '#E2ECE4',
  darkTextMuted: '#A0B2A6',

  // Utilities
  white: '#FFFFFF',
  amber: '#F59E0B',
  red: '#EF4444',
} as const

export const theme = {
  colors: themeColors,

  dark: {
    background: themeColors.darkBg, // #273338
    card: themeColors.darkCard,     // #2B5748
    subCard: themeColors.darkSubCard, // #202B2F
    border: themeColors.darkBorder, // #618764
    accent: themeColors.sage,       // #9CB080
    accentHover: '#8CA070',
    text: themeColors.darkText,
    textSecondary: themeColors.darkTextSecondary,
    textMuted: themeColors.darkTextMuted,
  },

  light: {
    background: themeColors.lightBg, // #F5F7F4
    card: themeColors.lightCard,     // #FFFFFF
    subCard: themeColors.lightSubCard, // #EDF2EB
    border: themeColors.lightBorder, // #D8E2D6
    accent: themeColors.pine,       // #2B5748
    accentHover: '#23473B',
    text: themeColors.lightText,
    textSecondary: themeColors.lightTextSecondary,
    textMuted: themeColors.lightTextMuted,
  },

  /**
   * Tailwind utility classes composed of the plain solid theme colors
   */
  classes: {
    // Layout & Backgrounds
    pageBg: 'bg-[#F5F7F4] dark:bg-[#273338] transition-all duration-200',
    card: 'bg-white dark:bg-[#2B5748] border border-[#D8E2D6] dark:border-[#618764] transition-all duration-200',
    subCard: 'bg-[#EDF2EB] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] transition-all duration-200',
    navScrolled: 'bg-white dark:bg-[#273338] border-b border-[#D8E2D6] dark:border-[#618764] transition-all duration-200',
    footer: 'bg-[#EDF2EB] dark:bg-[#202B2F] border-t border-[#D8E2D6] dark:border-[#618764] transition-all duration-200',
    divider: 'bg-[#D8E2D6] dark:bg-[#618764]/40 transition-all duration-200',

    // Form controls
    input: 'bg-[#F5F7F4] dark:bg-[#202B2F] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#9CB080] focus:ring-1 focus:ring-[#9CB080] transition-all duration-200',

    // Action buttons (Strict Plain Colors)
    btnPrimary: 'bg-[#9CB080] hover:bg-[#8CA070] text-[#273338] font-black transition-all duration-200 cursor-pointer',
    btnSecondary: 'bg-white dark:bg-[#2B5748] border border-[#D8E2D6] dark:border-[#618764] text-[#273338] dark:text-white hover:bg-slate-100 dark:hover:bg-[#202B2F] font-semibold transition-all duration-200 cursor-pointer',
    btnPine: 'bg-[#2B5748] hover:bg-[#23473B] text-white font-bold transition-all duration-200 cursor-pointer',
    btnForest: 'bg-[#618764] hover:bg-[#527355] text-white font-bold transition-all duration-200 cursor-pointer',

    // Typography
    textPrimary: 'text-[#273338] dark:text-white transition-all duration-200',
    textSecondary: 'text-[#4A5D54] dark:text-[#E2ECE4] transition-all duration-200',
    textMuted: 'text-[#75887E] dark:text-[#A0B2A6] transition-all duration-200',
    textAccent: 'text-[#2B5748] dark:text-[#9CB080] transition-all duration-200',

    // Borders & Badges
    border: 'border-[#D8E2D6] dark:border-[#618764] transition-all duration-200',
    badgeAccent: 'bg-[#9CB080] text-[#273338] font-black',
    badgeForest: 'bg-[#618764] text-white font-bold',
    badgePine: 'bg-[#2B5748] text-white font-bold',
  },
} as const

export default theme
