import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

type Props = {
  session: Session;
};

interface Student {
  id: string;
  name: string;
}

export default function DashboardScreen({ session }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStudents = async () => {
    setRefreshing(true);
    const { data } = await supabase.from('students').select('id, name');
    setStudents(data || []);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, marginBottom: 12 }}>Welcome {session.user.email}</Text>
      <Button title="Sign Out" onPress={handleLogout} />
      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Text style={{ paddingVertical: 8 }}>{item.name}</Text>}
        refreshing={refreshing}
        onRefresh={fetchStudents}
      />
    </View>
  );
}
