import 'react-native-gesture-handler'
import 'react-native-url-polyfill/auto'
import React, { useEffect, useState } from 'react'
import { TamaguiProvider, Theme } from 'tamagui'
import config from './tamagui.config'
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { supabase } from './src/supabaseClient';
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AuthorizationsScreen from './src/screens/AuthorizationsScreen';
import { Session } from '@supabase/supabase-js';

const Stack = createNativeStackNavigator();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!navigationRef.isReady()) return;
    const currentRoute = navigationRef.getCurrentRoute()?.name;
    if (session && currentRoute !== 'Dashboard') {
      navigationRef.navigate('Dashboard');
    } else if (!session && currentRoute !== 'Login') {
      navigationRef.navigate('Login');
    }
  }, [session, navigationRef]);

  return (
    <TamaguiProvider config={config}>
      <Theme name="light">
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator
            initialRouteName={session ? 'Dashboard' : 'Login'}
            screenOptions={{ headerShown: false, animation: 'fade' }}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Dashboard">
              {() => <DashboardScreen session={session} />}
            </Stack.Screen>
            <Stack.Screen name="Authorizations" component={AuthorizationsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </Theme>
    </TamaguiProvider>
  )
}
