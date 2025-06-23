import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Button, FlatList, RefreshControl } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

type Props = {
  session: Session;
};

interface Student {
  id: string;
  name: string;
  isAuthorized: boolean;
}

export default function DashboardScreen({ session }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStudents = useCallback(async () => {
    setRefreshing(true);

    // Look up the parent by email to get their ID
    const { data: parent } = await supabase
      .from('parents')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if (parent) {
      // Direct children
      const { data: directChildren } = await supabase
        .from('students')
        .select('id, name, student_parents!inner(parent_id)')
        .eq('student_parents.parent_id', parent.id);

      const today = new Date().toISOString().split('T')[0];

      // Authorized children
      const { data: authorized } = await supabase
        .from('pickup_authorizations')
        .select('students(id, name)')
        .eq('authorized_parent_id', parent.id)
        .eq('is_active', true)
        .lte('start_date', today)
        .gte('end_date', today);

      const formattedDirect = (directChildren || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        isAuthorized: false
      }));

      const formattedAuthorized = (authorized || []).map((a: any) => ({
        id: a.students.id,
        name: a.students.name,
        isAuthorized: true
      }));

      const all = [...formattedDirect];
      formattedAuthorized.forEach(child => {
        if (!all.some(c => c.id === child.id)) {
          all.push(child);
        }
      });

      setStudents(all);
    } else {
      setStudents([]);
    }

    setRefreshing(false);
  }, [session.user.email]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

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
        renderItem={({ item }) => (
          <Text style={{ paddingVertical: 8 }}>
            {item.name}
            {item.isAuthorized ? ' (authorized)' : ''}
          </Text>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchStudents} />
        }
      />
    </View>
  );
}
