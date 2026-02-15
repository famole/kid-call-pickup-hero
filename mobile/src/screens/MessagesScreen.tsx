// mobile/src/screens/MessagesScreen.tsx
import { useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../design-system/colors';

export default function MessagesScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: colors.gray800 }}>
          Messages
        </Text>
        <Text style={{ fontSize: 14, color: colors.gray500, marginTop: 4 }}>
          School announcements and notifications
        </Text>
      </View>
      
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={{ 
          backgroundColor: colors.white, 
          borderRadius: 16, 
          padding: 24,
          alignItems: 'center',
          justifyContent: 'center',
          height: 300,
        }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>💬</Text>
          <Text style={{ fontSize: 16, color: colors.gray600, textAlign: 'center' }}>
            Messages coming soon
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}