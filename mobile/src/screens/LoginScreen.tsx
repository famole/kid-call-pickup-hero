import React, { useState } from 'react'
import { supabase } from '../supabaseClient'
import { YStack, Input, Button, Paragraph, Theme, Spinner, AnimatePresence, Card } from 'tamagui'

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
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
        </Card>
      </YStack>
    </Theme>
  )
}
