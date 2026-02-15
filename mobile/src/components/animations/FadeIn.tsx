// mobile/src/components/animations/FadeIn.tsx
import { useEffect } from 'react';
import type { FC, ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { springConfig, timingConfig } from '../../design-system/animations';

interface FadeInProps {
  children: ReactNode;
  delay?: number;
  duration?: 'fast' | 'normal' | 'slow';
  spring?: boolean;
  style?: StyleProp<ViewStyle>;
  onAnimationComplete?: () => void;
}

export const FadeIn: FC<FadeInProps> = ({
  children,
  delay = 0,
  duration = 'normal',
  spring = false,
  style,
  onAnimationComplete,
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (spring) {
        opacity.value = withSpring(1, springConfig.gentle);
        translateY.value = withSpring(0, springConfig.gentle, () => {
          if (onAnimationComplete) {
            runOnJS(onAnimationComplete)();
          }
        });
      } else {
        opacity.value = withTiming(1, timingConfig[duration]);
        translateY.value = withTiming(0, timingConfig[duration], () => {
          if (onAnimationComplete) {
            runOnJS(onAnimationComplete)();
          }
        });
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [delay, duration, onAnimationComplete, opacity, spring, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
};