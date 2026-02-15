// mobile/src/components/molecules/PickupQR.tsx
import React, { useEffect, useState } from 'react';
import { YStack, XStack, Text, AnimatePresence } from 'tamagui';
import { View, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { Card } from '../atoms/Card';
import { Button } from '../atoms/Button';
import { colors, gradients } from '../../design-system/colors';
import { springConfig } from '../../design-system/animations';
import { FadeIn } from '../animations/FadeIn';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
const QR_SIZE = width * 0.6;

interface PickupQRProps {
  childName: string;
  qrData: string;
  expiryTime?: Date;
  onRefresh?: () => void;
}

export const PickupQR: React.FC<PickupQRProps> = ({
  childName,
  qrData,
  expiryTime,
  onRefresh,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const scale = useSharedValue(0.8);
  const pulse = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, springConfig.bouncy);
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    if (!expiryTime) return;
    
    const interval = setInterval(() => {
      const now = new Date();
      const diff = expiryTime.getTime() - now.getTime();
      
      if (diff <= 0) {
        setTimeLeft('Expired');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiryTime]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      pulse.value,
      [0, 1],
      [0.3, 0.6],
      Extrapolate.CLAMP
    ),
    transform: [
      {
        scale: interpolate(
          pulse.value,
          [0, 1],
          [1, 1.1],
          Extrapolate.CLAMP
        ),
      },
    ],
  }));

  const qrContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleExpand = () => {
    setIsExpanded(!isExpanded);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSpring(isExpanded ? 1 : 1.05, springConfig.bouncy);
  };

  return (
    <FadeIn delay={200}>
      <Card variant="elevated" padding="lg">
        <YStack alignItems="center" space="$4">
          {/* Header */}
          <XStack justifyContent="space-between" alignItems="center" width="100%">
            <YStack>
              <Text fontSize={14} color="$gray10" fontWeight="500">
                Pickup Authorization
              </Text>
              <Text fontSize={20} fontWeight="700" color="$gray12">
                {childName}
              </Text>
            </YStack>
            <View
              style={{
                backgroundColor: colors.mint[400] + '20',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
              }}
            >
              <Text fontSize={12} fontWeight="600" color={colors.mint[500]}>
                Active
              </Text>
            </View>
          </XStack>

          {/* QR Code with pulse effect */}
          <View style={{ position: 'relative', marginVertical: 20 }}>
            {/* Animated pulse background */}
            <Animated.View
              style={[
                {
                  position: 'absolute',
                  width: QR_SIZE + 40,
                  height: QR_SIZE + 40,
                  borderRadius: (QR_SIZE + 40) / 2,
                  backgroundColor: colors.primary[400],
                  alignSelf: 'center',
                  top: -20,
                  left: -20,
                },
                pulseStyle,
              ]}
            />
            
            {/* QR Container */}
            <Animated.View
              style={[
                {
                  backgroundColor: 'white',
                  padding: 20,
                  borderRadius: 24,
                  shadowColor: colors.primary[700],
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.2,
                  shadowRadius: 24,
                  elevation: 10,
                },
                qrContainerStyle,
              ]}
            >
              <QRCode
                value={qrData}
                size={QR_SIZE}
                color={colors.gray[900]}
                backgroundColor="white"
                logo={require('../../../assets/logo-icon.png')} // Your small logo
                logoSize={40}
                logoBackgroundColor="white"
                logoMargin={4}
                logoBorderRadius={8}
              />
            </Animated.View>

            {/* Tap hint */}
            <View
              style={{
                position: 'absolute',
                bottom: -30,
                alignSelf: 'center',
                backgroundColor: colors.gray[900],
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
              }}
            >
              <Text fontSize={12} color="white" fontWeight="600">
                Tap to expand
              </Text>
            </View>
          </View>

          {/* Timer */}
          <YStack alignItems="center" space="$2">
            <Text fontSize={14} color="$gray10">
              Expires in
            </Text>
            <Text
              fontSize={32}
              fontWeight="800"
              color={timeLeft === 'Expired' ? colors.coral[400] : colors.primary[400]}
              fontVariant={['tabular-nums']}
            >
              {timeLeft || '--:--'}
            </Text>
          </YStack>

          {/* Actions */}
          <XStack space="$3" width="100%">
            <Button
              variant="secondary"
              size="md"
              onPress={onRefresh}
              haptic="light"
              style={{ flex: 1 }}
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="md"
              onPress={handleExpand}
              haptic="medium"
              style={{ flex: 2 }}
            >
              {isExpanded ? 'Collapse' : 'Full Screen'}
            </Button>
          </XStack>
        </YStack>
      </Card>
    </FadeIn>
  );
};