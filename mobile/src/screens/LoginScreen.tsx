import React, { useState } from 'react'
import { supabase } from '../supabaseClient'
import {
  YStack,
  Input,
  Button,
  Paragraph,
  Theme,
  Spinner,
  AnimatePresence,
  Card
} from 'tamagui'
import * as WebBrowser from 'expo-web-browser'
import * as AuthSession from 'expo-auth-session'

WebBrowser.maybeCompleteAuthSession()

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    setError(null)

    try {
      const redirectUrl = AuthSession.makeRedirectUri({ useProxy: true })
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl }
      })

      if (error) throw error

      const result = await AuthSession.startAsync({ authUrl: data.url })

      if (result.type === 'success') {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.params)
        if (exchangeError) {
          setError(exchangeError.message)
        } else {
          // The auth state change will handle checking if the user exists in the database
          // If they don't exist, they'll be signed out automatically
        }
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <Theme name="light">
      <YStack flex={1} justifyContent="center" padding="$4">
        <Card padding="$6" elevate bordered borderRadius="$4" width="90%" alignSelf="center" space>
          <Input
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            borderRadius="$4"
          />
          <Input
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            borderRadius="$4"
          />
          <AnimatePresence>
            {error && (
              <Paragraph
                color="red"
                textAlign="center"
                enterStyle={{ opacity: 0 }}
                exitStyle={{ opacity: 0 }}
              >
                {error}
              </Paragraph>
            )}
          </AnimatePresence>
          <Button
            onPress={handleLogin}
            disabled={loading}
            icon={loading ? <Spinner /> : null}
            borderRadius="$4"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
          <Button
            onPress={handleGoogleLogin}
            disabled={googleLoading}
            icon={googleLoading ? <Spinner /> : null}
            borderRadius="$4"
           >
            {googleLoading ? 'Redirecting…' : 'Sign in with Google'}
          </Button>
        </Card>
      </YStack>
    </Theme>
  )
}
