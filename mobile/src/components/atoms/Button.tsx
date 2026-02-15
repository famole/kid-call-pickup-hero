// mobile/src/components/atoms/Button.tsx
import { useCallback } from 'react';
import type { FC, ReactNode } from 'react';
import { Pressable, View, Text, ActivityIndicator, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { colors, gradients } from '../../design-system/colors';
import { spring } from '../../design-system/animations';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gradient';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  haptic?: 'light' | 'medium' | 'heavy' | 'none';
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Button: FC<ButtonProps> = ({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  haptic = 'medium',
  style,
}) => {
  const scale = useSharedValue(1);

  const sizes = {
    sm: { height: 36, paddingHorizontal: 16, fontSize: 14 },
    md: { height: 48, paddingHorizontal: 24, fontSize: 16 },
    lg: { height: 56, paddingHorizontal: 32, fontSize: 18 },
  };

  const variants = {
    primary: {
      background: colors.primary,
      color: colors.white,
    },
    secondary: {
      background: colors.gray100,
      color: colors.gray900,
    },
    ghost: {
      background: 'transparent',
      color: colors.primary,
    },
    danger: {
      background: colors.coral,
      color: colors.white,
    },
    gradient: {
      background: 'transparent',
      color: colors.white,
    },
  };

  const currentSize = sizes[size];
  const currentVariant = variants[variant];

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, spring.stiff);
    if (haptic !== 'none') {
      Haptics.impactAsync(
        haptic === 'light' 
          ? Haptics.ImpactFeedbackStyle.Light 
          : haptic === 'medium' 
            ? Haptics.ImpactFeedbackStyle.Medium 
            : Haptics.ImpactFeedbackStyle.Heavy
      );
    }
  }, [haptic, scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, spring.gentle);
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled || loading ? 0.6 : 1,
  }));

  const buttonContent = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          height: currentSize.height,
          paddingHorizontal: currentSize.paddingHorizontal,
          backgroundColor: variant === 'gradient' ? 'transparent' : currentVariant.background,
          borderRadius: 12,
          gap: 8,
        },
        style,
      ]}
    >
      {variant === 'gradient' && !disabled && (
        <LinearGradient
          colors={[gradients.primary[0], gradients.primary[1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            borderRadius: 12,
          }}
        />
      )}
      
      {loading ? (
        <ActivityIndicator size="small" color={currentVariant.color} />
      ) : (
        <>
          {icon}
          <Text
            style={{
              color: currentVariant.color,
              fontSize: currentSize.fontSize,
              fontWeight: '600',
              letterSpacing: 0.3,
            }}
          >
            {children}
          </Text>
        </>
      )}
    </View>
  );

  return (
    <AnimatedPressable
      onPress={disabled || loading ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        animatedStyle,
        { width: fullWidth ? '100%' : undefined },
      ]}
    >
      {buttonContent}
    </AnimatedPressable>
  );
};