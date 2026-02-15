// mobile/src/screens/ProfileScreen.tsx
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../design-system/colors';
import { supabase } from '../supabaseClient';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.gray50 }}>
      <View style={{ paddingTop: insets.top + 16, paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: colors.gray800 }}>
          Profile
        </Text>
        <Text style={{ fontSize: 14, color: colors.gray500, marginTop: 4 }}>
          Manage your account and settings
        </Text>
      </View>
      
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
      >
        <View style={{ gap: 12 }}>
          <View style={{ 
            backgroundColor: colors.white, 
            borderRadius: 16, 
            padding: 20,
          }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.gray800, marginBottom: 8 }}>
              Account Settings
            </Text>
            <Text style={{ fontSize: 14, color: colors.gray500 }}>
              Manage your profile information
            </Text>
          </View>

          <View style={{ 
            backgroundColor: colors.white, 
            borderRadius: 16, 
            padding: 20,
          }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.gray800, marginBottom: 8 }}>
              Notifications
            </Text>
            <Text style={{ fontSize: 14, color: colors.gray500 }}>
              Configure push notification preferences
            </Text>
          </View>

          <Pressable
            onPress={handleSignOut}
            style={{ 
              backgroundColor: colors.coral + '15', 
              borderRadius: 16, 
              padding: 20,
              marginTop: 24,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.coral, textAlign: 'center' }}>
              Sign Out
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}