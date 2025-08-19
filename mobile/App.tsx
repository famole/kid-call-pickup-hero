import 'react-native-gesture-handler'
import 'react-native-url-polyfill/auto'
import './src/i18n'
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
import * as Notifications from 'expo-notifications'
import Constants from 'expo-constants'
import { Platform } from 'react-native'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
})

async function registerForPushNotificationsAsync() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== 'granted') {
    return
  }
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
  await Notifications.getExpoPushTokenAsync({
    projectId,
    useNextNotificationsApi: true,
  })
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    })
  }
}

const Stack = createNativeStackNavigator();

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });
    registerForPushNotificationsAsync();

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
