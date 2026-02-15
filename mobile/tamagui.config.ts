// mobile/tamagui.config.ts
import { createTamagui } from 'tamagui';
import { config as configBase } from '@tamagui/config/v3';
import { colors } from './src/design-system/colors';

// Define tokens properly with $true keys
const tokens = {
  color: {
    primary50: colors.primary50,
    primary100: colors.primary100,
    primary200: colors.primary200,
    primary300: colors.primary300,
    primary400: colors.primary400,
    primary500: colors.primary500,
    primary600: colors.primary600,
    primary700: colors.primary700,
    primary800: colors.primary800,
    primary900: colors.primary900,
    
    coral400: colors.coral400,
    coral500: colors.coral500,
    coral600: colors.coral600,
    
    mint400: colors.mint400,
    mint500: colors.mint500,
    mint600: colors.mint600,
    
    gray50: colors.gray50,
    gray100: colors.gray100,
    gray200: colors.gray200,
    gray300: colors.gray300,
    gray400: colors.gray400,
    gray500: colors.gray500,
    gray600: colors.gray600,
    gray700: colors.gray700,
    gray800: colors.gray800,
    gray900: colors.gray900,
    
    white: colors.white,
    black: colors.black,
  },
  space: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
    true: 16, // default size
  },
  size: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
    true: 16, // default size
  },
  radius: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    true: 8, // default radius
  },
  zIndex: {
    0: 0,
    1: 100,
    2: 200,
    3: 300,
    4: 400,
    5: 500,
    true: 0,
  },
};

export const config = createTamagui({
  ...configBase,
  
  themes: {
    light: {
      background: colors.background,
      backgroundStrong: colors.gray50,
      backgroundSoft: colors.gray100,
      backgroundHover: colors.gray100,
      backgroundPress: colors.gray200,
      backgroundFocus: colors.gray200,
      backgroundTransparent: colors.background + '00',
      
      color: colors.gray900,
      colorHover: colors.gray800,
      colorPress: colors.gray700,
      colorFocus: colors.gray700,
      colorMuted: colors.gray500,
      colorMutedHover: colors.gray600,
      
      borderColor: colors.gray200,
      borderColorHover: colors.gray300,
      borderColorPress: colors.gray400,
      borderColorFocus: colors.primary400,
      
      primary: colors.primary400,
      primaryHover: colors.primary500,
      primaryPress: colors.primary600,
      primaryFocus: colors.primary300,
      
      secondary: colors.gray100,
      secondaryHover: colors.gray200,
      
      accent: colors.coral400,
      accentHover: colors.coral500,
      
      success: colors.mint400,
      warning: '#F6AD55',
      error: colors.coral400,
      
      shadowColor: colors.gray900,
      shadowColorHover: colors.gray800,
      
      blue: colors.primary400,
      indigo: colors.primary700,
      coral: colors.coral400,
      mint: colors.mint400,
    },
    
    dark: {
      background: colors.backgroundDark,
      backgroundStrong: colors.primary900,
      backgroundSoft: colors.primary800,
      backgroundHover: colors.primary800,
      backgroundPress: colors.primary700,
      backgroundFocus: colors.primary700,
      
      color: colors.gray50,
      colorHover: colors.gray100,
      colorPress: colors.gray200,
      colorFocus: colors.gray200,
      colorMuted: colors.gray400,
      
      borderColor: colors.primary700,
      borderColorHover: colors.primary600,
      
      primary: colors.primary300,
      primaryHover: colors.primary200,
      primaryPress: colors.primary100,
      
      secondary: colors.primary800,
      
      accent: colors.coral400,
      success: colors.mint400,
      
      shadowColor: '#000000',
    },
  },
  
  tokens,
  
  fonts: {
    heading: {
      family: 'System',
      size: {
        1: 12,
        2: 14,
        3: 16,
        4: 18,
        5: 20,
        6: 24,
        7: 30,
        8: 36,
        9: 48,
        true: 16,
      },
      weight: {
        4: '400',
        5: '500',
        6: '600',
        7: '700',
        8: '800',
      },
      lineHeight: {
        1: 17,
        2: 20,
        3: 23,
        4: 26,
        5: 29,
        6: 32,
        7: 35,
        8: 40,
      },
      letterSpacing: {
        4: -0.5,
        8: -1,
      },
    },
    body: {
      family: 'System',
      size: {
        1: 12,
        2: 14,
        3: 16,
        4: 18,
        5: 20,
        6: 24,
        true: 16,
      },
      weight: {
        4: '400',
        5: '500',
        6: '600',
        7: '700',
      },
      lineHeight: {
        1: 17,
        2: 20,
        3: 23,
        4: 26,
        5: 29,
        6: 32,
      },
    },
  },
  
  media: {
    xs: { maxWidth: 660 },
    sm: { maxWidth: 800 },
    md: { maxWidth: 1020 },
    lg: { maxWidth: 1280 },
    xl: { maxWidth: 1420 },
    xxl: { maxWidth: 1600 },
    gtXs: { minWidth: 660 + 1 },
    gtSm: { minWidth: 800 + 1 },
    gtMd: { minWidth: 1020 + 1 },
    gtLg: { minWidth: 1280 + 1 },
  },
  
  shorthands: {
    px: 'paddingHorizontal',
    py: 'paddingVertical',
    mx: 'marginHorizontal',
    my: 'marginVertical',
    bg: 'backgroundColor',
    bc: 'borderColor',
    br: 'borderRadius',
    bw: 'borderWidth',
    w: 'width',
    h: 'height',
  },
});

// Use type assertion to avoid the empty interface issue
export type Conf = typeof config;

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends Conf {}
}

export default config;