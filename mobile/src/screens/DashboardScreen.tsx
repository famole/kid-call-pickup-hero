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
import PickupStatus from '../components/PickupStatus';

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
  const [activeRequests, setActiveRequests] = useState<{
    studentId: string;
    status: 'pending' | 'called';
  }[]>([]);

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
    fetchActiveRequests();
  }, [session.user.email, fetchActiveRequests]);

  const fetchActiveRequests = useCallback(async () => {
    const { data: parentId, error: parentError } = await supabase.rpc(
      'get_current_parent_id'
    );
    if (parentError || !parentId) {
      setActiveRequests([]);
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    const [own, authorized] = await Promise.all([
      supabase
        .from('student_parents')
        .select('student_id')
        .eq('parent_id', parentId),
      supabase
        .from('pickup_authorizations')
        .select('student_id')
        .eq('authorized_parent_id', parentId)
        .eq('is_active', true)
        .lte('start_date', today)
        .gte('end_date', today)
    ]);

    const ids = [
      ...(own.data?.map((r: any) => r.student_id) || []),
      ...(authorized.data?.map((r: any) => r.student_id) || [])
    ];

    const uniqueIds = Array.from(new Set(ids));
    if (uniqueIds.length === 0) {
      setActiveRequests([]);
      return;
    }

    const { data: requests } = await supabase
      .from('pickup_requests')
      .select('student_id,status')
      .in('student_id', uniqueIds)
      .in('status', ['pending', 'called']);

    const formatted = (requests || []).map((r: any) => ({
      studentId: r.student_id,
      status: r.status as 'pending' | 'called'
    }));

    setActiveRequests(formatted);
  }, []);

  useEffect(() => {
    fetchStudents();
    fetchActiveRequests();
  }, [fetchStudents, fetchActiveRequests]);

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
      fetchActiveRequests();
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
      <PickupStatus students={students} requests={activeRequests} />
      <FlatList
        style={styles.list}
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const request = activeRequests.find(r => r.studentId === item.id);
          const disabled = !!request;
          return (
            <TouchableOpacity
              style={[
                styles.item,
                selectedStudentId === item.id && styles.selectedItem,
                disabled && styles.disabledItem
              ]}
              onPress={() => !disabled && handleSelectStudent(item.id)}
            >
              <View style={styles.itemTextContainer}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.isAuthorized && (
                  <Text style={styles.authorized}>Authorized</Text>
                )}
              </View>
              {request && (
                <Text style={styles.status}>
                  {request.status === 'pending' ? 'In Queue' : 'Called'}
                </Text>
              )}
            </TouchableOpacity>
          );
        }}
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
  disabledItem: {
    opacity: 0.5
  },
  itemTextContainer: {
    flexDirection: 'column'
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
  status: {
    fontSize: 12,
    color: '#333'
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 32,
    color: '#666'
  }
});
