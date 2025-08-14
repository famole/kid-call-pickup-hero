// Redesigned LoginScreen.tsx
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  YStack,
  Input,
  Button,
  Paragraph,
  Theme,
  Spinner,
  Card,
  Text,
} from 'tamagui';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { Image } from 'react-native';
import { useTranslation } from 'react-i18next';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);
    try {
      const redirectUrl = AuthSession.makeRedirectUri({ useProxy: true });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl },
      });
      if (error) throw error;
      const result = await AuthSession.startAsync({ authUrl: data.url });
      if (result.type === 'success') {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.params);
        if (exchangeError) {
          setError(exchangeError.message);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Theme name="light">
      <YStack flex={1} justifyContent="center" padding="$4" backgroundColor="#3b82f6">
        <Image
          source={require('../../assets/upsy_logo.png')}
          style={{ width: 100, height: 100, alignSelf: 'center', marginBottom: 20 }}
        />
        <Card padding="$6" elevate bordered borderRadius="$6" width="100%" space>
          <Text fontSize={22} fontWeight="bold" textAlign="center" marginBottom={16}>
            {t('auth.welcomeToUpsy')}
          </Text>
          <Input
            placeholder={t('auth.email')}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            borderRadius="$6"
            size="$5"
          />
          <Input
            placeholder={t('auth.password')}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            borderRadius="$6"
            size="$5"
          />
          {error && (
            <Paragraph color="red" textAlign="center">{error}</Paragraph>
          )}
          <Button onPress={handleLogin} disabled={loading} icon={loading ? <Spinner /> : null} borderRadius="$6" size="$5">
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </Button>
          <Button onPress={handleGoogleLogin} disabled={googleLoading} icon={googleLoading ? <Spinner /> : null} borderRadius="$6" size="$5" backgroundColor="#fff" color="#000">
            {googleLoading ? t('auth.signingInWithGoogle') : t('auth.signInWithGoogle')}
          </Button>
        </Card>
      </YStack>
    </Theme>
  );
}

// The same principle will be applied to DashboardScreen.tsx and AuthorizationsScreen.tsx:
// - Bigger buttons and touch areas
// - Cards with rounded corners and spacing
// - Floating action buttons for primary actions
// - Modern typography and color hierarchy
// - Collapsible sections for grouping content
// - Date pickers and selection modals for forms
