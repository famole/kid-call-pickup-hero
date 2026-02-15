// mobile/src/design-system/typography.ts
export const typography = {
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  
  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  
  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
  
  // Specific use cases
  hero: {
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 1.2,
    letterSpacing: -0.5,
  },
  
  title: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 1.3,
  },
  
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 1.4,
  },
  
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 1.5,
  },
  
  caption: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 1.4,
    letterSpacing: 0.2,
  },
  
  button: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 1,
    letterSpacing: 0.3,
  },
};