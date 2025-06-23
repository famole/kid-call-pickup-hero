import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  YStack,
  XStack,
  Button,
  Text,
  ListItem,
  Theme,
  Spinner,
  AnimatePresence,
  Card,
  Sheet
} from 'tamagui'
import { FlatList, RefreshControl, Alert, SafeAreaView, Image } from 'react-native'
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeRequests, setActiveRequests] = useState<{
    studentId: string;
    status: 'pending' | 'called';
  }[]>([]);
  const studentsRef = useRef<Student[]>([]);

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

  useEffect(() => {
    studentsRef.current = students;
  }, [students]);

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

  useEffect(() => {
    const handleChange = (payload: any) => {
      const id = payload.new?.student_id || payload.old?.student_id;
      if (id && studentsRef.current.some(s => s.id === id)) {
        fetchActiveRequests();
      }
    };

    const channel = supabase
      .channel('parent_dashboard_mobile')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pickup_requests', filter: 'status=eq.pending' },
        handleChange
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pickup_requests', filter: 'status=eq.called' },
        handleChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchActiveRequests]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Theme name="light">
        <YStack flex={1} padding="$4" space>
          <Card padding="$4" elevate bordered>
            <XStack justifyContent="space-between" alignItems="center" space>
              <Text fontSize="$6" fontWeight="bold" numberOfLines={1} flex={1}>
                Welcome {session.user.email}
              </Text>
              <Button size="$3" onPress={() => setMenuOpen(true)}>☰</Button>
            </XStack>
          </Card>
        <PickupStatus students={students} requests={activeRequests} />
        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 16 }}
          data={students}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const request = activeRequests.find(r => r.studentId === item.id)
            const disabled = !!request
            return (
              <ListItem
                pressTheme
                backgroundColor={
                  selectedStudentId === item.id ? '$blue3' : undefined
                }
                onPress={() => !disabled && handleSelectStudent(item.id)}
                disabled={disabled}
                title={item.name}
                titleProps={{ numberOfLines: 1 }}
                subTitle={item.isAuthorized ? 'Authorized' : undefined}
                icon={request ? (
                  <Text fontSize="$2">
                    {request.status === 'pending' ? 'In Queue' : 'Called'}
                  </Text>
                ) : null}
              />
            )
          }}
          ListEmptyComponent={<Text textAlign="center" marginTop="$8">No students found.</Text>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchStudents} />}
        />
        <Button
          size="$5"
          onPress={handleRequestPickup}
          disabled={!selectedStudentId || loading}
          icon={loading ? <Spinner /> : null}
        >
          {loading ? 'Requesting...' : 'Request Pickup'}
        </Button>
      </YStack>
      <Sheet modal open={menuOpen} onOpenChange={setMenuOpen} snapPoints={[40]}>
        <Sheet.Overlay />
        <Sheet.Handle />
        <Sheet.Frame padding="$4" alignItems="center" space>
          <Image
            source={require('../../../public/lovable-uploads/8268b74f-a6aa-4f00-ac2b-ce117a9c3706.png')}
            style={{ width: 80, height: 80 }}
          />
          <Text fontSize="$7" fontWeight="bold">Upsy</Text>
          <Button size="$4" onPress={handleLogout}>Logout</Button>
        </Sheet.Frame>
      </Sheet>
      </Theme>
    </SafeAreaView>
  )
}
