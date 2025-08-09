// Define color palette with proper TypeScript types and safe access
const colorPalette = {
  primary: "#3366FF",
  primaryDark: "#2952CC",
  secondary: "#FF6B6B",
  background: "#FFFFFF",
  card: "#F7F9FC",
  text: "#2E3A59",
  border: "#E4E9F2",
  notification: "#FF3D71",
  success: "#00E096",
  warning: "#FFAA00",
  error: "#FF3D71",
  gray: {
    50: "#F8FAFC",
    100: "#F7F9FC",
    200: "#EDF1F7",
    300: "#E4E9F2",
    400: "#C5CEE0",
    500: "#8F9BB3",
    600: "#2E3A59",
    700: "#222B45",
    800: "#1A2138",
    900: "#151A30",
  },
  green: {
    50: "#F0FDF4",
    100: "#DCFCE7",
    200: "#BBF7D0",
    300: "#86EFAC",
    400: "#4ADE80",
    500: "#22C55E",
    600: "#16A34A",
    700: "#15803D",
    800: "#166534",
    900: "#14532D",
  },
  blue: {
    50: "#EFF6FF",
    100: "#DBEAFE",
    200: "#BFDBFE",
    300: "#93C5FD",
    400: "#60A5FA",
    500: "#3B82F6",
    600: "#2563EB",
    700: "#1D4ED8",
    800: "#1E40AF",
    900: "#1E3A8A",
  }
} as const;

// Safe color access function to prevent undefined errors
const safeColorAccess = (colorPath: string, fallback: string = "#000000"): string => {
  try {
    const parts = colorPath.split('.');
    let current: any = colorPalette;
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        console.warn(`Color path '${colorPath}' not found, using fallback: ${fallback}`);
        return fallback;
      }
    }
    
    return typeof current === 'string' ? current : fallback;
  } catch (error) {
    console.warn(`Error accessing color '${colorPath}':`, error);
    return fallback;
  }
};

// Export with proper error handling and safe access
export const Colors = {
  ...colorPalette,
  // Add safe access method
  safe: safeColorAccess,
};

// Type for the Colors object
export type ColorsType = typeof Colors;