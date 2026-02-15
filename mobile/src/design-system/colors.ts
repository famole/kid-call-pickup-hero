// mobile/src/design-system/colors.ts
export const colors = {
  // Primary Blues
  primary50: '#E6F2FF',
  primary100: '#CCE5FF',
  primary200: '#99CBFF',
  primary300: '#66B2FF',
  primary400: '#3B9EFF',  // Your logo blue
  primary500: '#2A8AEB',
  primary600: '#1E6FC4',
  primary700: '#1E3A5F',  // Deep indigo
  primary800: '#152A45',
  primary900: '#0D1B2A',
  
  // Accents
  coral400: '#FF6B6B',
  coral500: '#FF5252',
  coral600: '#E04646',
  
  mint400: '#4ECDC4',
  mint500: '#3DBDB4',
  mint600: '#2FA89F',
  
  // Neutrals
  gray50: '#F7F9FC',
  gray100: '#EDF2F7',
  gray200: '#E2E8F0',
  gray300: '#CBD5E0',
  gray400: '#A0AEC0',
  gray500: '#718096',
  gray600: '#4A5568',
  gray700: '#2D3748',
  gray800: '#1A202C',
  gray900: '#171923',
  
  // Semantic shortcuts
  primary: '#3B9EFF',
  primaryDark: '#1E3A5F',
  coral: '#FF6B6B',
  mint: '#4ECDC4',
  white: '#FFFFFF',
  black: '#000000',
  
  // Backgrounds
  background: '#FFFFFF',
  backgroundDark: '#0D1B2A',
  surface: '#F7F9FC',
  surfaceElevated: '#FFFFFF',
};

export const gradients = {
  primary: ['#3B9EFF', '#2A8AEB'] as const,
  sunset: ['#FF6B6B', '#FF8E53'] as const,
  ocean: ['#4ECDC4', '#3B9EFF'] as const,
  dark: ['#1E3A5F', '#0D1B2A'] as const,
};