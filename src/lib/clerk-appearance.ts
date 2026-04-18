import type { ClerkProvider } from '@clerk/nextjs';
import type { ComponentProps } from 'react';

type ClerkThemeAppearance = NonNullable<ComponentProps<typeof ClerkProvider>['appearance']>;

/** Align Clerk light/dark surfaces with `next-themes` (incl. `theme-*-light` variants). */
export function isMemoSparkDarkTheme(theme: string | undefined): boolean {
  if (theme == null || theme === '') return true;
  if (theme === 'light') return false;
  if (theme === 'dark') return true;
  if (theme.endsWith('-light')) return false;
  return true;
}

/**
 * MemoSpark + Clerk theming
 *
 * - Uses Clerk’s current `variables` API (avoid deprecated colorText / colorInputBackground, etc.).
 * - **Account modal (UserProfile):** solid panel + readable backdrop — avoids “broken glass”
 *   where translucent layers and the page background fight each other.
 * - **Sign-in / Sign-up:** outer page already wraps the component in a `card`; inner `rootBox`
 *   stays transparent so we don’t double-stack panels.
 */

const PRIMARY = 'hsl(142 76% 36%)';
const PRIMARY_HOVER = 'hsl(142 76% 32%)';

const lightVariables = {
  colorPrimary: PRIMARY,
  colorDanger: 'hsl(0 72% 45%)',
  colorSuccess: 'hsl(142 76% 32%)',
  colorWarning: 'hsl(38 92% 45%)',
  colorForeground: 'hsl(222 47% 11%)',
  colorMutedForeground: 'hsl(215 16% 35%)',
  colorBackground: 'hsl(210 40% 99%)',
  colorMuted: 'hsl(210 35% 96%)',
  colorInput: 'hsl(0 0% 100%)',
  colorInputForeground: 'hsl(222 47% 11%)',
  colorBorder: 'hsl(214 32% 88%)',
  colorRing: PRIMARY,
  colorNeutral: 'hsl(215 16% 47%)',
  colorModalBackdrop: 'rgba(15, 23, 42, 0.58)',
  colorShadow: 'rgba(15, 23, 42, 0.12)',
  borderRadius: '0.75rem',
  fontFamily: '"Inter", system-ui, sans-serif',
  fontSize: {
    xs: '0.75rem',
    sm: '0.8125rem',
    md: '0.875rem',
    lg: '1rem',
    xl: '1.125rem',
  },
} satisfies NonNullable<ClerkThemeAppearance['variables']>;

const darkVariables = {
  colorPrimary: PRIMARY,
  colorDanger: 'hsl(0 72% 58%)',
  colorSuccess: 'hsl(142 76% 42%)',
  colorWarning: 'hsl(38 92% 55%)',
  colorForeground: 'hsl(210 40% 98%)',
  colorMutedForeground: 'hsl(215 20% 72%)',
  colorBackground: 'hsl(222 47% 9%)',
  colorMuted: 'hsl(217 33% 14%)',
  colorInput: 'hsl(217 33% 12%)',
  colorInputForeground: 'hsl(210 40% 98%)',
  colorBorder: 'hsl(217 33% 22%)',
  colorRing: PRIMARY,
  colorNeutral: 'hsl(215 20% 55%)',
  colorModalBackdrop: 'rgba(0, 0, 0, 0.78)',
  colorShadow: 'rgba(0, 0, 0, 0.45)',
  borderRadius: '0.75rem',
  fontFamily: '"Inter", system-ui, sans-serif',
  fontSize: {
    xs: '0.75rem',
    sm: '0.8125rem',
    md: '0.875rem',
    lg: '1rem',
    xl: '1.125rem',
  },
} satisfies NonNullable<ClerkThemeAppearance['variables']>;

const lightElements = {
  /* Embedded SignIn/SignUp — page supplies the outer card */
  rootBox: {
    width: '100%',
    backgroundColor: 'transparent',
    boxShadow: 'none',
    border: 'none',
    padding: 0,
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
  },
  card: {
    backgroundColor: 'transparent',
    boxShadow: 'none',
    border: 'none',
  },
  cardBox: {
    backgroundColor: 'transparent',
    boxShadow: 'none',
    border: 'none',
  },
  headerTitle: {
    color: 'hsl(222 47% 11%)',
    fontSize: '1.375rem',
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  headerSubtitle: {
    color: 'hsl(215 16% 38%)',
    fontSize: '0.875rem',
    lineHeight: 1.5,
  },
  /* Account modal — solid surfaces */
  modalBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
    backdropFilter: 'blur(10px) saturate(140%)',
    WebkitBackdropFilter: 'blur(10px) saturate(140%)',
  },
  modalContent: {
    backgroundColor: 'hsl(210 40% 99%)',
    color: 'hsl(222 47% 11%)',
    borderRadius: '0.75rem',
    border: '1px solid hsl(214 32% 88%)',
    boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.25)',
    overflow: 'hidden',
  },
  userProfileRoot: {
    backgroundColor: 'hsl(210 40% 99%)',
    color: 'hsl(222 47% 11%)',
    borderRadius: '0.75rem',
  },
  /**
   * UserProfile uses a **vertical** left rail — use a trailing border + column layout.
   * (borderBottom was wrong here and made the rail feel broken / “empty”.)
   */
  navbar: {
    backgroundColor: 'hsl(210 35% 97%)',
    borderBottom: 'none',
    borderRight: '1px solid hsl(214 32% 90%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    gap: '0.375rem',
    padding: '1rem 0.75rem',
    boxSizing: 'border-box',
    minWidth: '15.5rem',
    minHeight: '100%',
  },
  navbarButton: {
    color: 'hsl(222 47% 11%)',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '0.5rem',
    width: '100%',
    minHeight: '2.75rem',
    padding: '0.5rem 0.75rem',
    borderRadius: '0.5rem',
    textAlign: 'left',
    lineHeight: 1.35,
    '&:hover': {
      backgroundColor: 'hsl(210 35% 94%)',
    },
  },
  navbarButtonText: {
    display: 'inline-flex',
    alignItems: 'center',
    lineHeight: 1.35,
    textAlign: 'left',
    flex: '1 1 auto',
  },
  /** Keeps Clerk + custom UserProfilePage label icons visible (not squashed to 0) */
  navbarButtonIcon: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '1.25rem',
    height: '1.25rem',
    color: 'inherit',
    overflow: 'visible',
  },
  scrollBox: {
    backgroundColor: 'hsl(210 40% 99%)',
  },
  pageScrollBox: {
    backgroundColor: 'hsl(210 40% 99%)',
  },
  profileSectionTitle: {
    fontSize: '1.0625rem',
    fontWeight: 700,
    color: 'hsl(222 47% 11%)',
  },
  profileSectionSubtitle: {
    color: 'hsl(215 16% 38%)',
    fontWeight: 500,
  },
  formFieldLabel: {
    fontWeight: 600,
    color: 'hsl(222 47% 18%)',
  },
  formFieldInput: {
    borderRadius: '0.5rem',
    border: '1px solid hsl(214 32% 88%)',
    backgroundColor: 'hsl(0 0% 100%)',
    color: 'hsl(222 47% 11%)',
    '&:focus': {
      borderColor: PRIMARY,
      boxShadow: "0 0 0 2px hsl(142 76% 36% / 0.25)",
    },
  },
  /** PasswordInput uses an absolutely positioned IconButton; avoid clipping and stacking issues */
  formFieldInputGroup: {
    overflow: 'visible',
  },
  formFieldInputShowPasswordButton: {
    minHeight: 'unset',
    minWidth: 'unset',
    zIndex: 2,
  },
  formButtonPrimary: {
    backgroundColor: PRIMARY,
    color: 'hsl(0 0% 100%)',
    fontWeight: 600,
    borderRadius: '0.5rem',
    '&:hover': {
      backgroundColor: PRIMARY_HOVER,
    },
  },
  socialButtonsBlockButton: {
    borderRadius: '0.5rem',
    border: '1px solid hsl(214 32% 88%)',
    backgroundColor: 'hsl(0 0% 100%)',
    color: 'hsl(222 47% 11%)',
    fontWeight: 600,
    '&:hover': {
      backgroundColor: 'hsl(210 35% 97%)',
      borderColor: PRIMARY,
    },
  },
  footerActionLink: {
    color: 'hsl(142 76% 30%)',
    fontWeight: 600,
    '&:hover': {
      color: PRIMARY_HOVER,
    },
  },
  userButtonTrigger: {
    backgroundColor: 'transparent !important',
    backdropFilter: 'none !important',
    WebkitBackdropFilter: 'none !important',
    boxShadow: 'none !important',
    border: 'none !important',
    padding: '0 !important',
    width: '28px !important',
    height: '28px !important',
    '&:hover': { backgroundColor: 'transparent !important' },
    '&:focus': { backgroundColor: 'transparent !important', boxShadow: 'none !important' },
  },
  userButtonBox: {
    backgroundColor: 'transparent !important',
    backdropFilter: 'none !important',
    WebkitBackdropFilter: 'none !important',
    boxShadow: 'none !important',
    border: 'none !important',
  },
  userButtonOuterBox: {
    backgroundColor: 'transparent !important',
    backdropFilter: 'none !important',
    WebkitBackdropFilter: 'none !important',
    boxShadow: 'none !important',
    border: 'none !important',
  },
  userButtonAvatarBox: {
    backgroundColor: 'transparent !important',
    boxShadow: 'none !important',
    border: 'none !important',
    width: '28px !important',
    height: '28px !important',
  },
  avatarBox: {
    backgroundColor: 'transparent !important',
    backdropFilter: 'none !important',
    WebkitBackdropFilter: 'none !important',
    boxShadow: 'none !important',
    border: 'none !important',
  },
  userButtonPopoverCard: {
    backgroundColor: 'hsl(210 40% 99%)',
    color: 'hsl(222 47% 11%)',
    border: '1px solid hsl(214 32% 88%)',
    borderRadius: '0.75rem',
    boxShadow: '0 12px 24px -8px rgba(15, 23, 42, 0.22)',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
  },
  userButtonPopoverActionButton: {
    color: 'hsl(222 47% 11%)',
    fontWeight: 500,
    '&:hover': {
      backgroundColor: 'hsl(210 35% 96%)',
    },
  },
} as ClerkThemeAppearance['elements'];

const darkElements = {
  rootBox: {
    width: '100%',
    backgroundColor: 'transparent',
    boxShadow: 'none',
    border: 'none',
    padding: 0,
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
  },
  card: {
    backgroundColor: 'transparent',
    boxShadow: 'none',
    border: 'none',
  },
  cardBox: {
    backgroundColor: 'transparent',
    boxShadow: 'none',
    border: 'none',
  },
  headerTitle: {
    color: 'hsl(210 40% 98%)',
    fontSize: '1.375rem',
    fontWeight: 700,
    letterSpacing: '-0.02em',
  },
  headerSubtitle: {
    color: 'hsl(215 20% 72%)',
    fontSize: '0.875rem',
    lineHeight: 1.5,
  },
  modalBackdrop: {
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    backdropFilter: 'blur(12px) saturate(140%)',
    WebkitBackdropFilter: 'blur(12px) saturate(140%)',
  },
  modalContent: {
    backgroundColor: 'hsl(222 47% 9%)',
    color: 'hsl(210 40% 98%)',
    borderRadius: '0.75rem',
    border: '1px solid hsl(217 33% 22%)',
    boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.55)',
    overflow: 'hidden',
  },
  userProfileRoot: {
    backgroundColor: 'hsl(222 47% 9%)',
    color: 'hsl(210 40% 98%)',
    borderRadius: '0.75rem',
  },
  navbar: {
    backgroundColor: 'hsl(217 33% 11%)',
    borderBottom: 'none',
    borderRight: '1px solid hsl(217 33% 22%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    gap: '0.375rem',
    padding: '1rem 0.75rem',
    boxSizing: 'border-box',
    minWidth: '15.5rem',
    minHeight: '100%',
  },
  navbarButton: {
    color: 'hsl(210 40% 98%)',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '0.5rem',
    width: '100%',
    minHeight: '2.75rem',
    padding: '0.5rem 0.75rem',
    borderRadius: '0.5rem',
    textAlign: 'left',
    lineHeight: 1.35,
    '&:hover': {
      backgroundColor: 'hsl(217 33% 16%)',
    },
  },
  navbarButtonText: {
    display: 'inline-flex',
    alignItems: 'center',
    lineHeight: 1.35,
    textAlign: 'left',
    flex: '1 1 auto',
  },
  navbarButtonIcon: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '1.25rem',
    height: '1.25rem',
    color: 'inherit',
    overflow: 'visible',
  },
  scrollBox: {
    backgroundColor: 'hsl(222 47% 9%)',
  },
  pageScrollBox: {
    backgroundColor: 'hsl(222 47% 9%)',
  },
  profileSectionTitle: {
    fontSize: '1.0625rem',
    fontWeight: 700,
    color: 'hsl(210 40% 98%)',
  },
  profileSectionSubtitle: {
    color: 'hsl(215 20% 72%)',
    fontWeight: 500,
  },
  formFieldLabel: {
    fontWeight: 600,
    color: 'hsl(210 40% 95%)',
  },
  formFieldInput: {
    borderRadius: '0.5rem',
    border: '1px solid hsl(217 33% 24%)',
    backgroundColor: 'hsl(217 33% 12%)',
    color: 'hsl(210 40% 98%)',
    '&:focus': {
      borderColor: PRIMARY,
      boxShadow: "0 0 0 2px hsl(142 76% 36% / 0.35)",
    },
  },
  formFieldInputGroup: {
    overflow: 'visible',
  },
  formFieldInputShowPasswordButton: {
    minHeight: 'unset',
    minWidth: 'unset',
    zIndex: 2,
  },
  formButtonPrimary: {
    backgroundColor: PRIMARY,
    color: 'hsl(0 0% 100%)',
    fontWeight: 600,
    borderRadius: '0.5rem',
    '&:hover': {
      backgroundColor: 'hsl(142 76% 40%)',
    },
  },
  socialButtonsBlockButton: {
    borderRadius: '0.5rem',
    border: '1px solid hsl(217 33% 24%)',
    backgroundColor: 'hsl(217 33% 12%)',
    color: 'hsl(210 40% 98%)',
    fontWeight: 600,
    '&:hover': {
      backgroundColor: 'hsl(217 33% 16%)',
      borderColor: PRIMARY,
    },
  },
  footerActionLink: {
    color: 'hsl(142 76% 50%)',
    fontWeight: 600,
    '&:hover': {
      color: 'hsl(142 76% 58%)',
    },
  },
  userButtonTrigger: {
    backgroundColor: 'transparent !important',
    backdropFilter: 'none !important',
    WebkitBackdropFilter: 'none !important',
    boxShadow: 'none !important',
    border: 'none !important',
    padding: '0 !important',
    width: '28px !important',
    height: '28px !important',
    '&:hover': { backgroundColor: 'transparent !important' },
    '&:focus': { backgroundColor: 'transparent !important', boxShadow: 'none !important' },
  },
  userButtonBox: {
    backgroundColor: 'transparent !important',
    backdropFilter: 'none !important',
    WebkitBackdropFilter: 'none !important',
    boxShadow: 'none !important',
    border: 'none !important',
  },
  userButtonOuterBox: {
    backgroundColor: 'transparent !important',
    backdropFilter: 'none !important',
    WebkitBackdropFilter: 'none !important',
    boxShadow: 'none !important',
    border: 'none !important',
  },
  userButtonAvatarBox: {
    backgroundColor: 'transparent !important',
    boxShadow: 'none !important',
    border: 'none !important',
    width: '28px !important',
    height: '28px !important',
  },
  avatarBox: {
    backgroundColor: 'transparent !important',
    backdropFilter: 'none !important',
    WebkitBackdropFilter: 'none !important',
    boxShadow: 'none !important',
    border: 'none !important',
  },
  userButtonPopoverCard: {
    backgroundColor: 'hsl(222 47% 9%)',
    color: 'hsl(210 40% 98%)',
    border: '1px solid hsl(217 33% 22%)',
    borderRadius: '0.75rem',
    boxShadow: '0 12px 24px -8px rgba(0, 0, 0, 0.45)',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'none',
  },
  userButtonPopoverActionButton: {
    color: 'hsl(210 40% 98%)',
    fontWeight: 500,
    '&:hover': {
      backgroundColor: 'hsl(217 33% 16%)',
    },
  },
} as ClerkThemeAppearance['elements'];

/** Light — used when app theme resolves to light */
export const memoSparkClerkAppearance: ClerkThemeAppearance = {
  variables: lightVariables,
  elements: lightElements,
  layout: {
    logoPlacement: 'none',
    socialButtonsPlacement: 'bottom',
    socialButtonsVariant: 'blockButton',
  },
} as const;

/** Dark — used when app theme resolves to dark / dark variants */
export const memoSparkClerkAppearanceDark: ClerkThemeAppearance = {
  variables: darkVariables,
  elements: darkElements,
  layout: {
    logoPlacement: 'none',
    socialButtonsPlacement: 'bottom',
    socialButtonsVariant: 'blockButton',
  },
} as const;

/**
 * Dashboard `<UserButton />` — responsive avatar sizes + same modal / popover theming as the app.
 */
export function getMemoSparkDashboardUserButtonAppearance(
  isDark: boolean
): Pick<ClerkThemeAppearance, 'variables' | 'elements'> {
  const base = isDark ? darkElements : lightElements;
  const responsiveTrigger = {
    ...base.userButtonTrigger,
    width: '20px !important',
    height: '20px !important',
    '@media (min-width: 640px)': {
      width: '24px !important',
      height: '24px !important',
    },
    '@media (min-width: 1024px)': {
      width: '28px !important',
      height: '28px !important',
    },
  };
  const responsiveAvatar = {
    ...base.userButtonAvatarBox,
    width: '20px !important',
    height: '20px !important',
    '@media (min-width: 640px)': {
      width: '24px !important',
      height: '24px !important',
    },
    '@media (min-width: 1024px)': {
      width: '28px !important',
      height: '28px !important',
    },
  };
  return {
    variables: isDark
      ? {
          colorPrimary: PRIMARY,
          colorForeground: darkVariables.colorForeground,
          colorMutedForeground: darkVariables.colorMutedForeground,
          colorBackground: darkVariables.colorBackground,
          colorInput: darkVariables.colorInput,
          colorInputForeground: darkVariables.colorInputForeground,
          borderRadius: '0.5rem',
        }
      : {
          colorPrimary: PRIMARY,
          colorForeground: lightVariables.colorForeground,
          colorMutedForeground: lightVariables.colorMutedForeground,
          colorBackground: lightVariables.colorBackground,
          colorInput: lightVariables.colorInput,
          colorInputForeground: lightVariables.colorInputForeground,
          borderRadius: '0.5rem',
        },
    elements: {
      ...base,
      userButtonTrigger: responsiveTrigger,
      userButtonAvatarBox: responsiveAvatar,
    } as ClerkThemeAppearance['elements'],
  } satisfies Pick<ClerkThemeAppearance, 'variables' | 'elements'>;
}

/**
 * Marketing navbar `<UserButton />` — dashboard-dark avatar sizing + popover that reads as a
 * continuation of `#0c0e13` chrome (not a generic floating panel).
 */
export function getMemoSparkMarketingNavUserButtonAppearance(): Pick<
  ClerkThemeAppearance,
  'variables' | 'elements'
> {
  const dashboardDark = getMemoSparkDashboardUserButtonAppearance(true);
  return {
    variables: dashboardDark.variables,
    elements: {
      ...dashboardDark.elements,
      userButtonPopoverCard: {
        backgroundColor: '#0c0e13',
        color: 'hsl(210 40% 98%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '0.75rem',
        boxShadow: '0 14px 36px -12px rgba(0, 0, 0, 0.55)',
        backdropFilter: 'none',
        WebkitBackdropFilter: 'none',
      },
      userButtonPopoverActionButton: {
        color: 'hsl(210 40% 98%)',
        fontWeight: 500,
        borderRadius: '0.5rem',
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 0.06)',
        },
      },
    } as ClerkThemeAppearance['elements'],
  };
}
