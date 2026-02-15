// mobile/src/screens/DashboardScreen.tsx
import { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  ScrollView,
  RefreshControl, 
  Dimensions, 
  Pressable, 
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { colors, gradients } from '../design-system/colors';
import { spring } from '../design-system/animations';
import { supabase } from '../supabaseClient';

const { width } = Dimensions.get('window');
const HEADER_MAX = 180;
const HEADER_MIN = 90;

// Icon component type
interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

// Simple inline icon components
const IconHome = ({ size = 24, color = colors.gray400 }: IconProps) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ width: size * 0.8, height: size * 0.6, borderWidth: 2, borderColor: color, borderRadius: 4 }} />
  </View>
);

const IconCalendar = ({ size = 24, color = colors.gray400 }: IconProps) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ width: size * 0.8, height: size * 0.7, borderWidth: 2, borderColor: color, borderRadius: 4 }} />
  </View>
);

const IconMessage = ({ size = 24, color = colors.gray400 }: IconProps) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ width: size * 0.8, height: size * 0.6, borderWidth: 2, borderColor: color, borderRadius: 4 }} />
  </View>
);

const IconUser = ({ size = 24, color = colors.gray400 }: IconProps) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ width: size * 0.4, height: size * 0.4, borderWidth: 2, borderColor: color, borderRadius: size * 0.2 }} />
  </View>
);

const IconBell = ({ size = 24, color = colors.white }: IconProps) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ width: size * 0.7, height: size * 0.8, borderWidth: 2, borderColor: color, borderRadius: size * 0.35, borderBottomWidth: 0 }} />
  </View>
);

const IconPin = ({ size = 24, color = colors.primary }: IconProps) => (
  <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ width: size * 0.5, height: size * 0.5, borderWidth: 3, borderColor: color, borderRadius: size * 0.25 }} />
  </View>
);

// Animated pressable component
function ScalePress({ children, onPress, disabled = false }: { children: React.ReactNode; onPress?: () => void; disabled?: boolean }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: disabled ? 0.5 : 1,
  }));

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withSpring(0.95, spring.stiff);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, spring.gentle);
      }}
      onPress={disabled ? undefined : onPress}
    >
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// Card component
function Card({ children, onPress, style }: { children: React.ReactNode; onPress?: () => void; style?: any }) {
  const content = (
    <View
      style={[{
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 16,
        shadowColor: colors.gray900,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
      }, style]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return <ScalePress onPress={onPress}>{content}</ScalePress>;
  }
  return content;
}

// Quick action button
function QuickAction({ 
  icon: Icon, 
  label, 
  color, 
  onPress, 
  delay = 0 
}: { 
  icon: React.ComponentType<IconProps>;
  label: string; 
  color: string; 
  onPress: () => void; 
  delay?: number;
}) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    const timer = setTimeout(() => {
      opacity.value = withSpring(1, spring.gentle);
      translateY.value = withSpring(0, spring.gentle);
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <ScalePress onPress={onPress}>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <View style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            backgroundColor: color + '15',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Icon size={28} color={color} strokeWidth={2} />
          </View>
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.gray600 }}>
            {label}
          </Text>
        </View>
      </ScalePress>
    </Animated.View>
  );
}

export default function DashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [children, setChildren] = useState<any[]>([]);
  const [activities] = useState([
    { id: '1', title: 'Field Trip', time: '9:00 AM' },
    { id: '2', title: 'Sports Day', time: '2:00 PM' },
  ]);
  const scrollY = useSharedValue(0);
  const insets = useSafeAreaInsets();

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('children')
        .select('id, name')
        .eq('parent_id', user.id);
      
      setChildren(data || []);
    } catch (error) {
      console.error('Load error:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const headerStyle = useAnimatedStyle(() => ({
    height: interpolate(
      scrollY.value,
      [0, HEADER_MAX - HEADER_MIN],
      [HEADER_MAX, HEADER_MIN],
      Extrapolate.CLAMP
    ),
  }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      {/* Animated Header */}
      <Animated.View
        style={[{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          paddingTop: insets.top,
        }, headerStyle]}
      >
        <LinearGradient
          colors={[gradients.primary[0], gradients.primary[1]]}
          style={{ flex: 1, paddingHorizontal: 20 }}
        >
          {/* Header Row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16 }}>
            <View>
              <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', fontWeight: '500' }}>
                Good morning,
              </Text>
              <Text style={{ fontSize: 28, fontWeight: '800', color: colors.white }}>
                Welcome back!
              </Text>
            </View>
            <ScalePress onPress={() => {}}>
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(255,255,255,0.2)',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <IconBell size={22} color={colors.white} />
              </View>
            </ScalePress>
          </View>

          {/* Stats Row */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: 16,
              padding: 16,
              flex: 1,
            }}>
              <IconUser size={20} color={colors.white} />
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.white, marginTop: 8 }}>
                {children.length}
              </Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                Children
              </Text>
            </View>
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderRadius: 16,
              padding: 16,
              flex: 1,
            }}>
              <IconCalendar size={20} color={colors.white} />
              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.white, marginTop: 8 }}>
                {activities.length}
              </Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>
                Today
              </Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={{
          paddingTop: HEADER_MAX + insets.top + 20,
          paddingHorizontal: 16,
          paddingBottom: insets.bottom + 100,
        }}
        onScroll={(e) => {
          scrollY.value = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Quick Actions */}
        <View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.gray800, marginBottom: 16 }}>
            Quick Actions
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <QuickAction icon={IconPin} label="I'm Here" color={colors.primary} onPress={() => {}} delay={100} />
            <QuickAction icon={IconCalendar} label="Calendar" color={colors.mint} onPress={() => {}} delay={200} />
            <QuickAction icon={IconMessage} label="Messages" color={colors.coral} onPress={() => {}} delay={300} />
            <QuickAction icon={IconUser} label="Family" color={colors.primaryDark} onPress={() => {}} delay={400} />
          </View>
        </View>

        {/* Active Pickup */}
        {children.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.gray800, marginBottom: 16 }}>
              Active Pickup
            </Text>
            <Card>
              <View style={{ gap: 16 }}>
                {/* Header Row */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontSize: 14, color: colors.gray500 }}>Pickup Authorization</Text>
                    <Text style={{ fontSize: 20, fontWeight: '700', color: colors.gray800 }}>
                      {children[0]?.name}
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: colors.mint400 + '20',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: colors.mint400 }}>
                      Active
                    </Text>
                  </View>
                </View>

                {/* QR Placeholder */}
                <View style={{
                  alignSelf: 'center',
                  width: width * 0.5,
                  height: width * 0.5,
                  backgroundColor: colors.white,
                  borderRadius: 20,
                  justifyContent: 'center',
                  alignItems: 'center',
                  shadowColor: colors.primaryDark,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.2,
                  shadowRadius: 24,
                  elevation: 10,
                }}>
                  <View style={{
                    width: '80%',
                    height: '80%',
                    backgroundColor: colors.gray100,
                    borderRadius: 12,
                  }} />
                </View>

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Pressable
                    onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
                    style={{
                      flex: 1,
                      backgroundColor: colors.gray100,
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontWeight: '600', color: colors.gray700 }}>Refresh</Text>
                  </Pressable>
                  <Pressable
                    style={{
                      flex: 2,
                      backgroundColor: colors.primary,
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontWeight: '600', color: colors.white }}>Show QR</Text>
                  </Pressable>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* Activities */}
        <View style={{ marginTop: 24 }}>
          {/* Activities Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.gray800 }}>
              Today's Activities
            </Text>
            <ScalePress onPress={() => {}}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
                See all
              </Text>
            </ScalePress>
          </View>

          {activities.map((activity) => (
            <Card key={activity.id} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: colors.primary + '10',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <IconCalendar size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: colors.gray800 }}>
                    {activity.title}
                  </Text>
                  <Text style={{ fontSize: 13, color: colors.gray500, marginTop: 4 }}>
                    {activity.time}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}