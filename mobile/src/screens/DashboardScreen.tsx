import React, { useCallback, useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Button,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Alert
} from 'react-native';
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
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleSelectStudent = (id: string) => {
    setSelectedStudentId(id);
  };

  const handleRequestPickup = async () => {
    if (!selectedStudentId) return;
    setLoading(true);
    try {
      const { data: parentId, error: parentError } = await supabase.rpc(
        'get_current_parent_id'
      );
      if (parentError || !parentId) {
        throw new Error('Unable to determine current parent');
      }

      const { data: isAuthorized, error: authError } = await supabase.rpc(
        'is_parent_of_student',
        {
          student_id: selectedStudentId
        }
      );
      if (authError) {
        throw new Error('Authorization check failed');
      }
      if (!isAuthorized) {
        throw new Error('Not authorized for this student');
      }

      const { error } = await supabase.from('pickup_requests').insert({
        student_id: selectedStudentId,
        parent_id: parentId,
        status: 'pending',
        request_time: new Date().toISOString()
      });

      if (error) {
        throw error;
      }

      Alert.alert('Success', 'Pickup requested');
      setSelectedStudentId(null);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Welcome {session.user.email}</Text>
      <View style={styles.signOutButton}>
        <Button title="Sign Out" onPress={handleLogout} />
      </View>
      <FlatList
        style={styles.list}
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.item,
              selectedStudentId === item.id && styles.selectedItem
            ]}
            onPress={() => handleSelectStudent(item.id)}
          >
            <Text style={styles.itemName}>{item.name}</Text>
            {item.isAuthorized && (
              <Text style={styles.authorized}>Authorized</Text>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No students found.</Text>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchStudents} />
        }
      />
      <Button
        title={loading ? 'Requesting...' : 'Request Pickup'}
        onPress={handleRequestPickup}
        disabled={!selectedStudentId || loading}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12
  },
  signOutButton: {
    marginBottom: 16
  },
  list: {
    flex: 1
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f2f2f2',
    borderRadius: 8,
    marginBottom: 12
  },
  selectedItem: {
    backgroundColor: '#d0ebff'
  },
  itemName: {
    fontSize: 16
  },
  authorized: {
    fontSize: 12,
    color: '#555'
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    color: '#666'
  }
});
