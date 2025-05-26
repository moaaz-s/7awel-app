/**
 * UI Configuration
 *
 * This file contains shared UI constants and configuration
 * to ensure consistency across the application.
 */

// Color palette
export const colors = {
  primary: {
    gradient: "bg-gradient-to-r from-violet-600 to-blue-600",
    hover: "hover:from-violet-700 hover:to-blue-700",
    solid: "bg-violet-600",
    text: "text-violet-600",
    border: "border-violet-600",
    light: "bg-violet-50",
    lightText: "text-violet-500",
  },
  success: {
    solid: "bg-green-500",
    text: "text-green-500",
    light: "bg-green-50",
    border: "border-green-500",
  },
  error: {
    solid: "bg-red-500",
    text: "text-red-500",
    light: "bg-red-50",
    border: "border-red-500",
  },
  warning: {
    solid: "bg-amber-500",
    text: "text-amber-500",
    light: "bg-amber-50",
    border: "border-amber-500",
  },
  neutral: {
    background: "bg-muted",
    card: "bg-white",
    border: "border-gray-200",
    divider: "border-gray-100",
    muted: "text-gray-500",
    mutedLight: "text-gray-400",
  },
}

// Spacing system
export const spacing = {
  page: "p-4",
  section: "space-y-6",
  card: "p-4",
  stack: "space-y-4",
  stack_sm: "space-y-2",
  inline: "space-x-2",
  grid: "gap-4",
  container: "px-4", // Consistent horizontal padding
}

// Typography
export const typography = {
  h1: "text-2xl font-bold",
  h2: "text-xl font-medium",
  h3: "text-lg font-medium",
  body: "text-base",
  small: "text-sm",
  tiny: "text-xs",
  muted: "text-muted-foreground",
}

// Border radius
export const radius = {
  baseline: "rounded-2xl",
  full: "rounded-full",
}

// Shadows
export const shadows = {
  sm: "shadow-sm",
  md: "shadow",
  lg: "shadow-md",
}

// Animation
export const animation = {
  default: "transition-all duration-200",
  fast: "transition-all duration-150",
  slow: "transition-all duration-300",
}

// Button sizes
export const buttonSizes = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4",
  lg: "h-12 px-6 text-lg",
  xl: "h-14 px-8 text-lg",
}

// Common layout patterns
export const layouts = {
  pageContainer: "flex min-h-screen flex-col bg-gray-50",
  pageHeader: "bg-white p-4 flex items-center border-b",
  pageTitle: "text-lg font-medium",
  pageContent: "flex-1 p-4",
  card: "bg-white rounded-lg overflow-hidden",
  cardHeader: "p-4 border-b",
  cardContent: "p-4",
  cardFooter: "p-4 border-t",
  formGroup: "space-y-2",
  formLabel: "text-sm font-medium",
  formError: "text-xs text-red-500 mt-1",
}

// Icon sizes
export const iconSizes = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
  xxl: "h-10 w-10", // Added larger size for more prominent icons
}

// Common UI patterns
export const patterns = {
  listItem: "flex items-center justify-between p-4 hover:bg-gray-50 active:bg-gray-100",
  avatar: {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  },
  iconContainer: {
    sm: "h-8 w-8 flex items-center justify-center rounded-full",
    md: "h-10 w-10 flex items-center justify-center rounded-full",
    lg: "h-12 w-12 flex items-center justify-center rounded-full",
    xl: "h-16 w-16 flex items-center justify-center rounded-full", // Added larger size for more prominent icons
  },
  actionIcon: {
    container: "flex flex-col items-center gap-2",
    iconWrapper: "h-16 w-16 flex items-center justify-center rounded-full bg-white/20",
    icon: "h-8 w-8",
    label: "text-sm font-medium",
  },
}
