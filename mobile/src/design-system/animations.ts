// mobile/src/design-system/animations.ts
import { Easing } from 'react-native-reanimated';

export const springConfig = {
  gentle: {
    damping: 15,
    stiffness: 120,
    mass: 1,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 2,
  },
  bouncy: {
    damping: 10,
    stiffness: 200,
    mass: 0.8,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 2,
  },
  stiff: {
    damping: 20,
    stiffness: 300,
    mass: 0.8,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 2,
  },
};

export const timingConfig = {
  fast: { duration: 150, easing: Easing.bezier(0.4, 0, 0.2, 1) },
  normal: { duration: 300, easing: Easing.bezier(0.4, 0, 0.2, 1) },
  slow: { duration: 500, easing: Easing.bezier(0.4, 0, 0.2, 1) },
  emphasis: { duration: 400, easing: Easing.bezier(0.0, 0, 0.2, 1) },
};

export const transitions = {
  slideUp: {
    initial: { opacity: 0, translateY: 20 },
    animate: { opacity: 1, translateY: 0 },
    exit: { opacity: 0, translateY: -10 },
  },
  slideRight: {
    initial: { opacity: 0, translateX: -20 },
    animate: { opacity: 1, translateX: 0 },
    exit: { opacity: 0, translateX: 20 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
};

// mobile/src/design-system/animations.ts
export const spring = {
  gentle: { damping: 15, stiffness: 120 },
  bouncy: { damping: 10, stiffness: 200 },
  stiff: { damping: 20, stiffness: 300 },
};
