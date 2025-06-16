import type { 
  ThemeManifest, 
  ThemeColors, 
  ColorUtilities, 
  ValidationResult, 
  AccessibilityReport,
  AccessibilityIssue,
  UserTheme
} from '@/types/theme';

/**
 * Color utility functions for theme manipulation
 */
export const colorUtils: ColorUtilities = {
  hslToHex: (hsl: string): string => {
    const match = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
    if (!match) return '#000000';
    
    const [, h, s, l] = match.map(Number);
    const hDecimal = l / 100;
    const a = (s * Math.min(hDecimal, 1 - hDecimal)) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = hDecimal - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  },

  hexToHsl: (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  },

  lighten: (color: string, amount: number): string => {
    if (color.startsWith('#')) {
      color = colorUtils.hexToHsl(color);
    }
    const match = color.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
    if (!match) return color;
    
    const [, h, s, l] = match.map(Number);
    const newL = Math.min(100, l + amount);
    return `${h} ${s}% ${newL}%`;
  },

  darken: (color: string, amount: number): string => {
    return colorUtils.lighten(color, -amount);
  },

  adjustContrast: (foreground: string, background: string, minRatio = 4.5): string => {
    const contrast = colorUtils.validateAccessibility(foreground, background);
    if (contrast.ratio >= minRatio) return foreground;
    
    // Attempt to adjust lightness to meet contrast requirements
    let adjustedColor = foreground;
    const step = contrast.ratio < minRatio ? 10 : -10;
    
    for (let i = 0; i < 10; i++) {
      adjustedColor = step > 0 ? colorUtils.lighten(adjustedColor, step) : colorUtils.darken(adjustedColor, Math.abs(step));
      const newContrast = colorUtils.validateAccessibility(adjustedColor, background);
      if (newContrast.ratio >= minRatio) break;
    }
    
    return adjustedColor;
  },

  validateAccessibility: (foreground: string, background: string) => {
    // Simple luminance calculation for contrast ratio
    const getLuminance = (color: string) => {
      let hex = color;
      if (!color.startsWith('#')) {
        hex = colorUtils.hslToHex(color);
      }
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      
      const sRGB = [r, g, b].map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
      return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
    };
    
    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    
    return {
      ratio,
      aa: ratio >= 4.5,
      aaa: ratio >= 7
    };
  }
};

/**
 * Theme generation utilities
 */
export class ThemeGenerator {
  static generateFromColors(baseColors: Partial<ThemeColors>): ThemeColors {
    const defaults: ThemeColors = {
      background: '0 0% 10%',
      foreground: '0 0% 95%',
      card: '0 0% 15%',
      cardForeground: '0 0% 95%',
      popover: '0 0% 15%',
      popoverForeground: '0 0% 95%',
      primary: '142 55% 45%',
      primaryForeground: '0 0% 100%',
      secondary: '0 0% 20%',
      secondaryForeground: '0 0% 80%',
      muted: '0 0% 20%',
      mutedForeground: '0 0% 70%',
      accent: '0 0% 20%',
      accentForeground: '0 0% 80%',
      destructive: '0 62.8% 30.6%',
      destructiveForeground: '0 85.7% 97.3%',
      border: '0 0% 25%',
      input: '0 0% 20%',
      ring: '142 55% 45%',
      chart1: '142 50% 40%',
      chart2: '200 70% 50%',
      chart3: '280 70% 50%',
      chart4: '40 70% 50%',
      chart5: '0 70% 50%'
    };

    return { ...defaults, ...baseColors };
  }

  /**
   * Generate light theme variant from dark theme colors
   * Maintains color personality while providing appropriate contrast for light backgrounds
   */
  static generateLightVariant(darkColors: ThemeColors): ThemeColors {
    const parseHsl = (hsl: string): {h: number, s: number, l: number} => {
      const match = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
      if (!match) return {h: 0, s: 0, l: 50};
      return {
        h: parseInt(match[1]),
        s: parseInt(match[2]),
        l: parseInt(match[3])
      };
    };

    const createHsl = (h: number, s: number, l: number): string => 
      `${h} ${s}% ${l}%`;

    const invertLightness = (hsl: string, isBackground = false): string => {
      const {h, s, l} = parseHsl(hsl);
      // For backgrounds, invert more dramatically
      if (isBackground) {
        return createHsl(h, s, l <= 15 ? 95 + (15 - l) : 85 + (30 - l));
      }
      // For foregrounds and other elements, maintain readability
      return createHsl(h, s, l >= 50 ? 20 + (100 - l) * 0.3 : 80 - l * 0.8);
    };

    const adjustPrimary = (hsl: string): string => {
      const {h, s, l} = parseHsl(hsl);
      // For light themes, darken the primary for better contrast on light backgrounds
      const newL = l > 60 ? l - 20 : l > 40 ? l - 10 : l + 10;
      return createHsl(h, Math.max(s - 10, 40), Math.max(newL, 25));
    };

    const adjustSecondary = (hsl: string): string => {
      const {h, s, l} = parseHsl(hsl);
      // Light theme secondary should be light gray
      return createHsl(h, Math.min(s, 10), 92);
    };

    const adjustMuted = (hsl: string): string => {
      const {h, s, l} = parseHsl(hsl);
      // Light theme muted should be light gray
      return createHsl(h, Math.min(s, 8), 95);
    };

    return {
      // Invert backgrounds to light
      background: invertLightness(darkColors.background, true),
      foreground: invertLightness(darkColors.foreground),
      card: invertLightness(darkColors.card, true),
      cardForeground: invertLightness(darkColors.cardForeground),
      popover: invertLightness(darkColors.popover, true),
      popoverForeground: invertLightness(darkColors.popoverForeground),
      
      // Adjust primary to work on light background
      primary: adjustPrimary(darkColors.primary),
      primaryForeground: createHsl(0, 0, 98), // White text on primary
      
      // Light theme secondary and accent
      secondary: adjustSecondary(darkColors.secondary),
      secondaryForeground: invertLightness(darkColors.secondaryForeground),
      accent: adjustSecondary(darkColors.accent),
      accentForeground: invertLightness(darkColors.accentForeground),
      
      // Light theme muted
      muted: adjustMuted(darkColors.muted),
      mutedForeground: invertLightness(darkColors.mutedForeground),
      
      // Keep destructive similar but adjust for light theme
      destructive: darkColors.destructive,
      destructiveForeground: createHsl(0, 0, 98),
      
      // Light theme borders and inputs
      border: createHsl(0, 0, 85),
      input: createHsl(0, 0, 96),
      ring: adjustPrimary(darkColors.ring),
      
      // Adjust chart colors for light theme
      chart1: adjustPrimary(darkColors.chart1),
      chart2: adjustPrimary(darkColors.chart2),
      chart3: adjustPrimary(darkColors.chart3),
      chart4: adjustPrimary(darkColors.chart4),
      chart5: adjustPrimary(darkColors.chart5)
    };
  }

  static createThemeCSS(colors: ThemeColors, className: string): string {
    return `
.${className} {
  --background: ${colors.background};
  --foreground: ${colors.foreground};
  --card: ${colors.card};
  --card-foreground: ${colors.cardForeground};
  --popover: ${colors.popover};
  --popover-foreground: ${colors.popoverForeground};
  --primary: ${colors.primary};
  --primary-foreground: ${colors.primaryForeground};
  --secondary: ${colors.secondary};
  --secondary-foreground: ${colors.secondaryForeground};
  --muted: ${colors.muted};
  --muted-foreground: ${colors.mutedForeground};
  --accent: ${colors.accent};
  --accent-foreground: ${colors.accentForeground};
  --destructive: ${colors.destructive};
  --destructive-foreground: ${colors.destructiveForeground};
  --border: ${colors.border};
  --input: ${colors.input};
  --ring: ${colors.ring};
  ${colors.radius ? `--radius: ${colors.radius};` : ''}
  --chart-1: ${colors.chart1};
  --chart-2: ${colors.chart2};
  --chart-3: ${colors.chart3};
  --chart-4: ${colors.chart4};
  --chart-5: ${colors.chart5};
}`;
  }
}

/**
 * Theme validation utilities
 */
export class ThemeValidator {
  static validateManifest(manifest: ThemeManifest): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!manifest.id) errors.push('Theme ID is required');
    if (!manifest.name) errors.push('Theme name is required');
    if (!manifest.author) errors.push('Theme author is required');
    if (!manifest.version) errors.push('Theme version is required');
    
    // ID format validation
    if (manifest.id && !/^[a-z0-9-]+$/.test(manifest.id)) {
      errors.push('Theme ID must contain only lowercase letters, numbers, and hyphens');
    }

    // Preview colors validation
    if (!manifest.previewColors || manifest.previewColors.length < 3) {
      warnings.push('Theme should have at least 3 preview colors');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  static validateAccessibility(colors: ThemeColors): AccessibilityReport {
    const issues: AccessibilityIssue[] = [];
    let score = 100;

    // Test key color combinations
    const combinations = [
      { fg: colors.foreground, bg: colors.background, name: 'Main text' },
      { fg: colors.primaryForeground, bg: colors.primary, name: 'Primary button' },
      { fg: colors.secondaryForeground, bg: colors.secondary, name: 'Secondary button' },
      { fg: colors.mutedForeground, bg: colors.muted, name: 'Muted text' },
      { fg: colors.cardForeground, bg: colors.card, name: 'Card content' }
    ];

    combinations.forEach(({ fg, bg, name }) => {
      const contrast = colorUtils.validateAccessibility(fg, bg);
      
      if (!contrast.aa) {
        issues.push({
          type: 'contrast',
          severity: 'error',
          message: `${name} does not meet AA contrast requirements (${contrast.ratio.toFixed(2)}:1)`,
          suggestion: 'Increase contrast between foreground and background colors',
          elements: [name.toLowerCase().replace(' ', '-')]
        });
        score -= 15;
      } else if (!contrast.aaa) {
        issues.push({
          type: 'contrast',
          severity: 'warning',
          message: `${name} does not meet AAA contrast requirements (${contrast.ratio.toFixed(2)}:1)`,
          suggestion: 'Consider increasing contrast for better accessibility',
          elements: [name.toLowerCase().replace(' ', '-')]
        });
        score -= 5;
      }
    });

    return {
      passed: issues.filter(i => i.severity === 'error').length === 0,
      issues,
      score: Math.max(0, score)
    };
  }
}

/**
 * Theme storage and management
 */
export class ThemeManager {
  private static readonly STORAGE_KEY = 'memospark_user_themes';
  private static readonly CURRENT_THEME_KEY = 'memospark_current_theme';

  static saveUserTheme(theme: UserTheme): void {
    const existingThemes = this.getUserThemes();
    const updatedThemes = existingThemes.filter(t => t.id !== theme.id);
    updatedThemes.push({
      ...theme,
      updatedAt: new Date().toISOString()
    });
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedThemes));
  }

  static getUserThemes(): UserTheme[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static deleteUserTheme(id: string): void {
    const themes = this.getUserThemes().filter(t => t.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(themes));
  }

  static exportTheme(theme: UserTheme): string {
    const exportData = {
      ...theme,
      exportedAt: new Date().toISOString(),
      exportVersion: '1.0'
    };
    return JSON.stringify(exportData, null, 2);
  }

  static importTheme(themeData: string): UserTheme {
    const theme = JSON.parse(themeData);
    
    // Validate imported theme
    const validation = ThemeValidator.validateManifest(theme);
    if (!validation.isValid) {
      throw new Error(`Invalid theme: ${validation.errors.join(', ')}`);
    }

    return {
      ...theme,
      isUserCreated: true,
      createdAt: theme.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  static injectThemeCSS(theme: ThemeManifest): void {
    // Remove existing custom theme styles
    const existingStyle = document.getElementById('custom-theme-styles');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Inject new theme styles if custom CSS is provided
    if (theme.customCSS) {
      const style = document.createElement('style');
      style.id = 'custom-theme-styles';
      style.textContent = theme.customCSS;
      document.head.appendChild(style);
    }
  }
}

/**
 * Built-in theme definitions with full metadata
 */
export const BUILT_IN_THEMES: ThemeManifest[] = [
  {
    id: 'dark',
    name: 'Default Dark',
    description: 'The classic MemoSpark dark theme',
    author: 'MemoSpark Team',
    version: '1.0.0',
    category: 'default',
    previewColors: ['#1a1a1a', '#ffffff', '#22c55e'],
    compatibility: { minVersion: '1.0.0' }
  },
  // Add other themes here...
];

/**
 * Test the enhanced dark theme accessibility
 */
export const testEnhancedDarkTheme = () => {
  // Enhanced dark theme colors from globals.css
  const enhancedDarkColors: ThemeColors = {
    background: '0 0% 8%',
    foreground: '0 0% 98%',
    card: '0 0% 12%',
    cardForeground: '0 0% 98%',
    popover: '0 0% 12%',
    popoverForeground: '0 0% 98%',
    primary: '142 60% 50%',
    primaryForeground: '0 0% 8%',
    secondary: '0 0% 18%',
    secondaryForeground: '0 0% 92%',
    muted: '0 0% 15%',
    mutedForeground: '0 0% 75%',
    accent: '0 0% 18%',
    accentForeground: '0 0% 92%',
    destructive: '0 70% 55%',
    destructiveForeground: '0 0% 98%',
    border: '0 0% 30%',
    input: '0 0% 18%',
    ring: '142 60% 50%',
    radius: '1rem',
    chart1: '142 60% 50%',
    chart2: '200 50% 60%',
    chart3: '0 0% 98%',
    chart4: '0 0% 12%',
    chart5: '142 50% 40%'
  };

  console.log('🎨 Enhanced Dark Theme Accessibility Report:');
  const report = ThemeValidator.validateAccessibility(enhancedDarkColors);
  
  console.log(`✅ Accessibility Score: ${report.score}/100`);
  console.log(`🎯 Passed AA Requirements: ${report.passed ? 'YES' : 'NO'}`);
  
  if (report.issues.length > 0) {
    console.log('\n📋 Issues Found:');
    report.issues.forEach(issue => {
      const emoji = issue.severity === 'error' ? '❌' : '⚠️';
      console.log(`${emoji} ${issue.message}`);
    });
  } else {
    console.log('\n🎉 No accessibility issues found!');
  }
  
  return report;
};

/**
 * Generate all light theme variants for existing dark themes
 */
export const generateAllLightThemes = (): string => {
  // Define all existing dark theme colors
  const darkThemes: Record<string, ThemeColors> = {
    'light': { // Default light (generated from dark)
      background: '0 0% 8%',
      foreground: '0 0% 98%',
      card: '0 0% 12%',
      cardForeground: '0 0% 98%',
      popover: '0 0% 12%',
      popoverForeground: '0 0% 98%',
      primary: '142 60% 50%',
      primaryForeground: '0 0% 8%',
      secondary: '0 0% 18%',
      secondaryForeground: '0 0% 92%',
      muted: '0 0% 15%',
      mutedForeground: '0 0% 75%',
      accent: '0 0% 18%',
      accentForeground: '0 0% 92%',
      destructive: '0 70% 55%',
      destructiveForeground: '0 0% 98%',
      border: '0 0% 30%',
      input: '0 0% 18%',
      ring: '142 60% 50%',
      chart1: '142 60% 50%',
      chart2: '200 50% 60%',
      chart3: '0 0% 98%',
      chart4: '0 0% 12%',
      chart5: '142 50% 40%'
    },
    'theme-amoled-light': {
      background: '0 0% 0%',
      foreground: '0 0% 98%',
      card: '0 0% 3%',
      cardForeground: '0 0% 95%',
      popover: '0 0% 3%',
      popoverForeground: '0 0% 95%',
      primary: '142 70% 50%',
      primaryForeground: '0 0% 0%',
      secondary: '0 0% 8%',
      secondaryForeground: '0 0% 90%',
      muted: '0 0% 5%',
      mutedForeground: '0 0% 65%',
      accent: '0 0% 8%',
      accentForeground: '0 0% 90%',
      destructive: '0 85% 60%',
      destructiveForeground: '0 0% 98%',
      border: '0 0% 15%',
      input: '0 0% 8%',
      ring: '142 70% 50%',
      chart1: '142 70% 50%',
      chart2: '200 70% 60%',
      chart3: '280 70% 60%',
      chart4: '40 70% 60%',
      chart5: '0 70% 60%'
    },
    'theme-sea-blue-light': {
      background: '215 25% 7%',
      foreground: '200 20% 92%',
      card: '215 30% 12%',
      cardForeground: '200 15% 90%',
      popover: '215 30% 12%',
      popoverForeground: '200 15% 90%',
      primary: '195 100% 55%',
      primaryForeground: '220 40% 8%',
      secondary: '210 30% 20%',
      secondaryForeground: '200 15% 85%',
      muted: '215 25% 15%',
      mutedForeground: '200 10% 70%',
      accent: '210 30% 20%',
      accentForeground: '200 15% 85%',
      destructive: '5 85% 60%',
      destructiveForeground: '0 0% 98%',
      border: '215 25% 25%',
      input: '215 30% 15%',
      ring: '195 100% 55%',
      chart1: '195 100% 55%',
      chart2: '170 70% 50%',
      chart3: '240 70% 60%',
      chart4: '280 70% 60%',
      chart5: '350 70% 60%'
    },
    'theme-hello-kitty-pink-light': {
      background: '330 15% 8%',
      foreground: '330 10% 92%',
      card: '330 20% 12%',
      cardForeground: '330 10% 90%',
      popover: '330 20% 12%',
      popoverForeground: '330 10% 90%',
      primary: '330 100% 70%',
      primaryForeground: '330 30% 10%',
      secondary: '320 25% 20%',
      secondaryForeground: '330 10% 85%',
      muted: '330 15% 15%',
      mutedForeground: '330 8% 70%',
      accent: '320 25% 20%',
      accentForeground: '330 10% 85%',
      destructive: '0 85% 60%',
      destructiveForeground: '0 0% 98%',
      border: '330 20% 25%',
      input: '330 20% 15%',
      ring: '330 100% 70%',
      chart1: '330 100% 70%',
      chart2: '300 70% 60%',
      chart3: '350 70% 60%',
      chart4: '270 70% 60%',
      chart5: '45 70% 60%'
    },
    'theme-hacker-green-light': {
      background: '120 20% 4%',
      foreground: '120 40% 85%',
      card: '120 25% 8%',
      cardForeground: '120 35% 82%',
      popover: '120 25% 8%',
      popoverForeground: '120 35% 82%',
      primary: '120 100% 50%',
      primaryForeground: '120 30% 5%',
      secondary: '120 20% 15%',
      secondaryForeground: '120 30% 75%',
      muted: '120 15% 10%',
      mutedForeground: '120 20% 60%',
      accent: '120 20% 15%',
      accentForeground: '120 30% 75%',
      destructive: '0 85% 60%',
      destructiveForeground: '0 0% 98%',
      border: '120 25% 20%',
      input: '120 20% 12%',
      ring: '120 100% 50%',
      chart1: '120 100% 50%',
      chart2: '140 70% 50%',
      chart3: '100 70% 50%',
      chart4: '80 70% 50%',
      chart5: '160 70% 50%'
    },
    'theme-void-purple-light': {
      background: '260 25% 5%',
      foreground: '280 15% 92%',
      card: '260 30% 8%',
      cardForeground: '280 12% 90%',
      popover: '260 30% 8%',
      popoverForeground: '280 12% 90%',
      primary: '280 100% 70%',
      primaryForeground: '260 40% 8%',
      secondary: '270 25% 18%',
      secondaryForeground: '280 10% 85%',
      muted: '260 20% 12%',
      mutedForeground: '280 8% 68%',
      accent: '270 25% 18%',
      accentForeground: '280 10% 85%',
      destructive: '0 85% 60%',
      destructiveForeground: '0 0% 98%',
      border: '260 25% 22%',
      input: '260 25% 10%',
      ring: '280 100% 70%',
      chart1: '280 100% 70%',
      chart2: '250 70% 60%',
      chart3: '310 70% 60%',
      chart4: '200 70% 60%',
      chart5: '340 70% 60%'
    },
    'theme-sunset-orange-light': {
      background: '20 25% 6%',
      foreground: '30 20% 92%',
      card: '25 30% 10%',
      cardForeground: '30 15% 88%',
      popover: '25 30% 10%',
      popoverForeground: '30 15% 88%',
      primary: '25 100% 60%',
      primaryForeground: '20 40% 8%',
      secondary: '20 25% 18%',
      secondaryForeground: '30 12% 82%',
      muted: '20 20% 12%',
      mutedForeground: '25 15% 65%',
      accent: '20 25% 18%',
      accentForeground: '30 12% 82%',
      destructive: '0 85% 60%',
      destructiveForeground: '0 0% 98%',
      border: '20 25% 22%',
      input: '20 25% 10%',
      ring: '25 100% 60%',
      chart1: '25 100% 60%',
      chart2: '35 85% 55%',
      chart3: '15 85% 55%',
      chart4: '45 75% 55%',
      chart5: '5 85% 55%'
    },
    'theme-midnight-blue-light': {
      background: '220 30% 4%',
      foreground: '210 15% 92%',
      card: '220 35% 7%',
      cardForeground: '210 12% 88%',
      popover: '220 35% 7%',
      popoverForeground: '210 12% 88%',
      primary: '210 100% 65%',
      primaryForeground: '220 40% 6%',
      secondary: '215 30% 15%',
      secondaryForeground: '210 10% 82%',
      muted: '220 25% 10%',
      mutedForeground: '215 12% 65%',
      accent: '215 30% 15%',
      accentForeground: '210 10% 82%',
      destructive: '0 85% 60%',
      destructiveForeground: '0 0% 98%',
      border: '220 25% 18%',
      input: '220 30% 8%',
      ring: '210 100% 65%',
      chart1: '210 100% 65%',
      chart2: '190 80% 60%',
      chart3: '230 80% 60%',
      chart4: '170 75% 60%',
      chart5: '250 75% 60%'
    },
    'theme-cherry-blossom-light': {
      background: '340 20% 6%',
      foreground: '350 12% 92%',
      card: '340 25% 9%',
      cardForeground: '350 10% 88%',
      popover: '340 25% 9%',
      popoverForeground: '350 10% 88%',
      primary: '340 80% 65%',
      primaryForeground: '340 30% 8%',
      secondary: '335 25% 16%',
      secondaryForeground: '350 8% 82%',
      muted: '340 18% 11%',
      mutedForeground: '345 12% 65%',
      accent: '335 25% 16%',
      accentForeground: '350 8% 82%',
      destructive: '0 85% 60%',
      destructiveForeground: '0 0% 98%',
      border: '340 20% 20%',
      input: '340 22% 9%',
      ring: '340 80% 65%',
      chart1: '340 80% 65%',
      chart2: '320 70% 60%',
      chart3: '360 70% 60%',
      chart4: '300 65% 60%',
      chart5: '20 65% 60%'
    },
    'theme-carbon-light': {
      background: '0 0% 6%',
      foreground: '0 0% 92%',
      card: '0 0% 9%',
      cardForeground: '0 0% 88%',
      popover: '0 0% 9%',
      popoverForeground: '0 0% 88%',
      primary: '200 100% 60%',
      primaryForeground: '0 0% 8%',
      secondary: '0 0% 16%',
      secondaryForeground: '0 0% 82%',
      muted: '0 0% 11%',
      mutedForeground: '0 0% 65%',
      accent: '0 0% 16%',
      accentForeground: '0 0% 82%',
      destructive: '0 85% 60%',
      destructiveForeground: '0 0% 98%',
      border: '0 0% 20%',
      input: '0 0% 9%',
      ring: '200 100% 60%',
      chart1: '200 100% 60%',
      chart2: '180 80% 55%',
      chart3: '220 80% 55%',
      chart4: '160 75% 55%',
      chart5: '240 75% 55%'
    }
  };

  let cssOutput = '';
  
  for (const [themeName, darkColors] of Object.entries(darkThemes)) {
    const lightColors = ThemeGenerator.generateLightVariant(darkColors);
    const className = themeName === 'light' ? 'light' : themeName;
    cssOutput += ThemeGenerator.createThemeCSS(lightColors, className) + '\n\n';
  }

  return cssOutput;
};

/**
 * Theme utilities for easy access
 */
export const themeUtils = {
  colorUtils,
  ThemeGenerator,
  ThemeValidator,
  ThemeManager,
  BUILT_IN_THEMES,
  testEnhancedDarkTheme,
  generateAllLightThemes
}; 