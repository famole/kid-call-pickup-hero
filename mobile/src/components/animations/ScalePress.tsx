// mobile/src/components/animations/ScalePress.tsx
import { useCallback } from 'react';
import type { FC, ReactNode } from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { springConfig } from '../../design-system/animations';
import * as Haptics from 'expo-haptics';

interface ScalePressProps {
  children: ReactNode;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  scale?: number;
  haptic?: 'light' | 'medium' | 'heavy' | 'none';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const ScalePress: FC<ScalePressProps> = ({
  children,
  onPress,
  onPressIn,
  onPressOut,
  scale = 0.96,
  haptic = 'light',
  disabled = false,
  style,
}) => {
  const scaleValue = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scaleValue.value = withSpring(scale, springConfig.stiff);
    if (haptic !== 'none') {
      Haptics.impactAsync(
        haptic === 'light' 
          ? Haptics.ImpactFeedbackStyle.Light 
          : haptic === 'medium' 
            ? Haptics.ImpactFeedbackStyle.Medium 
            : Haptics.ImpactFeedbackStyle.Heavy
      );
    }
    onPressIn?.();
  }, [haptic, onPressIn, scale, scaleValue]);

  const handlePressOut = useCallback(() => {
    scaleValue.value = withSpring(1, springConfig.gentle);
    onPressOut?.();
  }, [onPressOut, scaleValue]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
    opacity: disabled ? 0.5 : 1,
  }));

  return (
    <AnimatedPressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, style]}
    >
      {children}
    </AnimatedPressable>
  );
};