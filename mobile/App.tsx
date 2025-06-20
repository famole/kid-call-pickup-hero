import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { supabase } from './src/supabaseClient';

export default function App() {
  React.useEffect(() => {
    // Simple test call to fetch current session
    supabase.auth.getSession().then(({ data }) => {
      console.log('session', data.session);
    });
  }, []);

  return (
    <View style={styles.container}>
      <Text>Welcome to Kid Call Pickup Hero Mobile!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
