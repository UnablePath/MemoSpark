export interface ThemeManifest {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  category: 'default' | 'minimal' | 'nature' | 'cosmic' | 'playful' | 'retro' | 'custom';
  previewColors: string[];
  colorSchemes?: ColorScheme[];
  customCSS?: string;
  features?: ThemeFeatures;
  compatibility: {
    minVersion: string;
    maxVersion?: string;
  };
}

export interface ColorScheme {
  id: string;
  name: string;
  colors: ThemeColors;
}

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  radius?: string;
  // Chart colors
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
}

export interface ThemeFeatures {
  roundedCorners?: boolean;
  animations?: boolean;
  glowEffects?: boolean;
  gradients?: boolean;
  customFonts?: string[];
  specialEffects?: SpecialEffect[];
}

export interface SpecialEffect {
  name: string;
  type: 'animation' | 'filter' | 'transform' | 'background';
  css: string;
  target?: string; // CSS selector
}

export interface UserTheme extends ThemeManifest {
  isUserCreated: true;
  createdAt: string;
  updatedAt: string;
  sourceFile?: string; // For themes loaded from files
}

export interface ThemeStore {
  themes: ThemeManifest[];
  userThemes: UserTheme[];
  currentTheme: string;
  lastUpdated: string;
}

export interface ThemeRepository {
  name: string;
  url: string;
  description: string;
  themes: ThemeManifest[];
  verified: boolean;
}

// Color utility functions
export interface ColorUtilities {
  hslToHex: (hsl: string) => string;
  hexToHsl: (hex: string) => string;
  lighten: (color: string, amount: number) => string;
  darken: (color: string, amount: number) => string;
  adjustContrast: (foreground: string, background: string, minRatio?: number) => string;
  validateAccessibility: (foreground: string, background: string) => {
    ratio: number;
    aa: boolean;
    aaa: boolean;
  };
}

// Theme validation
export interface ThemeValidator {
  validateManifest: (manifest: ThemeManifest) => ValidationResult;
  validateColors: (colors: ThemeColors) => ValidationResult;
  validateAccessibility: (colors: ThemeColors) => AccessibilityReport;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AccessibilityReport {
  passed: boolean;
  issues: AccessibilityIssue[];
  score: number; // 0-100
}

export interface AccessibilityIssue {
  type: 'contrast' | 'visibility' | 'readability';
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
  elements: string[]; // CSS selectors affected
}

// Theme categories with metadata
export const THEME_CATEGORIES = {
  default: {
    name: 'Default',
    description: 'Official themes',
    icon: '🏠'
  },
  minimal: {
    name: 'Minimal',
    description: 'Clean and simple designs',
    icon: '✨'
  },
  nature: {
    name: 'Nature',
    description: 'Earth and ocean inspired',
    icon: '🌊'
  },
  cosmic: {
    name: 'Cosmic',
    description: 'Space and sci-fi themes',
    icon: '🌌'
  },
  playful: {
    name: 'Playful',
    description: 'Fun and colorful designs',
    icon: '🎨'
  },
  retro: {
    name: 'Retro',
    description: 'Vintage and nostalgic vibes',
    icon: '📺'
  },
  custom: {
    name: 'Custom',
    description: 'User-created themes',
    icon: '🛠️'
  }
} as const; 