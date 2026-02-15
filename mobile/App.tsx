// mobile/App.tsx
import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import { useEffect, useState } from 'react';
import { StyleSheet, Linking } from 'react-native';
import { TamaguiProvider, Theme } from 'tamagui';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import config from './tamagui.config';
import AppNavigator from './src/navigation/AppNavigator';
import { supabase } from './src/supabaseClient';

export default function App() {
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    // Check auth session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Handle deep links for OAuth
    const linkingSubscription = Linking.addEventListener('url', (event) => {
      if (event.url) {
        supabase.auth.getSession();
      }
    });

    return () => {
      subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <TamaguiProvider config={config}>
          <Theme name="light">
            <AppNavigator session={session} />
          </Theme>
        </TamaguiProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});