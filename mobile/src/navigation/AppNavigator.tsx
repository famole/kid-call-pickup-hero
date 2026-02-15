// mobile/src/navigation/AppNavigator.tsx
import type { FC } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';

import DashboardScreen from '../screens/DashboardScreen';
import CalendarScreen from '../screens/CalendarScreen';
import MessagesScreen from '../screens/MessagesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import LoginScreen from '../screens/LoginScreen';
import { Session } from '@supabase/supabase-js';
import { colors } from '../design-system/colors';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Simple tab icons
const HomeIcon = ({ focused }: { focused: boolean }) => (
  <View style={{ 
    width: 24, 
    height: 24, 
    borderRadius: 4,
    backgroundColor: focused ? colors.primary : 'transparent',
    borderWidth: 2,
    borderColor: focused ? colors.primary : colors.gray400,
  }} />
);

const CalendarIcon = ({ focused }: { focused: boolean }) => (
  <View style={{ 
    width: 24, 
    height: 24, 
    borderRadius: 4,
    borderWidth: 2,
    borderColor: focused ? colors.primary : colors.gray400,
  }} />
);

const MessageIcon = ({ focused }: { focused: boolean }) => (
  <View style={{ 
    width: 24, 
    height: 24, 
    borderRadius: 4,
    borderWidth: 2,
    borderColor: focused ? colors.primary : colors.gray400,
  }} />
);

const UserIcon = ({ focused }: { focused: boolean }) => (
  <View style={{ 
    width: 24, 
    height: 24, 
    borderRadius: 12,
    borderWidth: 2,
    borderColor: focused ? colors.primary : colors.gray400,
  }} />
);

const TabNavigator: FC = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => {
          switch (route.name) {
            case 'Home': return <HomeIcon focused={focused} />;
            case 'Calendar': return <CalendarIcon focused={focused} />;
            case 'Messages': return <MessageIcon focused={focused} />;
            case 'Profile': return <UserIcon focused={focused} />;
            default: return <HomeIcon focused={focused} />;
          }
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.gray400,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 0,
          elevation: 0,
          height: 80,
          paddingBottom: 20,
          paddingTop: 12,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

interface AppNavigatorProps {
  session: Session | null;
}

const AppNavigator: FC<AppNavigatorProps> = ({ session }) => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!session ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="Main" component={TabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;