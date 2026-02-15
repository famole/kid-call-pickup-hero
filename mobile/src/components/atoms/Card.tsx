// mobile/src/components/atoms/Card.tsx
import type { FC, ReactNode } from 'react';
import { View, StyleProp, ViewStyle, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { colors } from '../../design-system/colors';
import { spring } from '../../design-system/animations';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  haptic?: 'light' | 'medium' | 'none';
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const shadows = {
  sm: {
    shadowColor: colors.gray900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: colors.gray900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.gray900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
};

export const Card: FC<CardProps> = ({
  children,
  onPress,
  variant = 'default',
  padding = 'md',
  haptic = 'light',
  style,
}) => {
  const scale = useSharedValue(1);

  const paddings = {
    none: 0,
    sm: 12,
    md: 16,
    lg: 24,
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'default':
        return {
          backgroundColor: colors.white,
          borderWidth: 0,
          borderColor: 'transparent',
          ...shadows.md,
        };
      case 'elevated':
        return {
          backgroundColor: colors.white,
          borderWidth: 0,
          borderColor: 'transparent',
          ...shadows.lg,
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.gray200,
        };
      case 'glass':
        return {
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.3)',
          ...shadows.md,
        };
      default:
        return {
          backgroundColor: colors.white,
          borderWidth: 0,
          borderColor: 'transparent',
          ...shadows.md,
        };
    }
  };

  const cardStyle = {
    borderRadius: 16,
    padding: paddings[padding],
    ...getVariantStyles(),
  };

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, spring.stiff);
      if (haptic !== 'none') {
        Haptics.impactAsync(
          haptic === 'light' 
            ? Haptics.ImpactFeedbackStyle.Light 
            : Haptics.ImpactFeedbackStyle.Medium
        );
      }
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1, spring.gentle);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const content = (
    <View style={[cardStyle, style]}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={animatedStyle}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return content;
};