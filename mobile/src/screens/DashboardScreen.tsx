import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  YStack,
  XStack,
  Button,
  Text,
  ListItem,
  Theme,
  Spinner,
  Card,
  Separator,
  Paragraph,
  Avatar
} from 'tamagui'
import { ScrollView, RefreshControl, Alert, SafeAreaView, AppState, StatusBar } from 'react-native'
import * as Notifications from 'expo-notifications'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../supabaseClient'
import PickupStatus from '../components/PickupStatus'
import { getCurrentParentIdCached } from '../../../src/services/parent/getCurrentParentId'
import MenuSheet from '../components/MenuSheet'

// TYPES

type Props = { session: Session }

interface Student {
  id: string
  name: string
  className?: string | null
  teacher?: string | null
  isAuthorized: boolean
}

export default function DashboardScreen({ session }: Props) {
  const [students, setStudents] = useState<Student[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeRequests, setActiveRequests] = useState<{
    id: string
    studentId: string
    status: 'pending' | 'called'
  }[]>([])
  const [queuePositions, setQueuePositions] = useState<Record<string, number>>({})
  const studentsRef = useRef<Student[]>([])
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const notifiedRef = useRef<Set<string>>(new Set())

  // ---------- DATA ----------
  const fetchStudents = useCallback(async () => {
    setRefreshing(true)

    const { data: parent } = await supabase
      .from('parents')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (parent) {
      const { data: directChildren } = await supabase
        .from('students')
        .select('id, name, classes(name, teacher), student_parents!inner(parent_id)')
        .eq('student_parents.parent_id', parent.id)

      const today = new Date().toISOString().split('T')[0]

      const { data: authorized } = await supabase
        .from('pickup_authorizations')
        .select('students(id, name, classes(name, teacher))')
        .eq('authorized_parent_id', parent.id)
        .eq('is_active', true)
        .lte('start_date', today)
        .gte('end_date', today)

      const formattedDirect = (directChildren || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        className: c.classes?.name ?? null,
        teacher: c.classes?.teacher ?? null,
        isAuthorized: false,
      }))

      const formattedAuthorized = (authorized || []).map((a: any) => ({
        id: a.students.id,
        name: a.students.name,
        className: a.students.classes?.name ?? null,
        teacher: a.students.classes?.teacher ?? null,
        isAuthorized: true,
      }))

      const all = [...formattedDirect]
      formattedAuthorized.forEach((child) => {
        if (!all.some((c) => c.id === child.id)) all.push(child)
      })

      setStudents(all)
    } else {
      setStudents([])
    }

    setRefreshing(false)
    fetchActiveRequests()
  }, [session.user.email])

  useEffect(() => {
    studentsRef.current = students
  }, [students])

  const fetchActiveRequests = useCallback(async () => {
    const parentId = await getCurrentParentIdCached()
    if (!parentId) {
      setActiveRequests([])
      return
    }

    const today = new Date().toISOString().split('T')[0]

    const [own, authorized] = await Promise.all([
      supabase.from('student_parents').select('student_id').eq('parent_id', parentId),
      supabase
        .from('pickup_authorizations')
        .select('student_id')
        .eq('authorized_parent_id', parentId)
        .eq('is_active', true)
        .lte('start_date', today)
        .gte('end_date', today),
    ])

    const ids = [
      ...(own.data?.map((r: any) => r.student_id) || []),
      ...(authorized.data?.map((r: any) => r.student_id) || []),
    ]

    const uniqueIds = Array.from(new Set(ids))
    if (uniqueIds.length === 0) {
      setActiveRequests([])
      return
    }

    const { data: requests } = await supabase
      .from('pickup_requests')
      .select('id,student_id,status')
      .in('student_id', uniqueIds)
      .in('status', ['pending', 'called'])

    const formatted = (requests || []).map((r: any) => ({
      id: r.id,
      studentId: r.student_id,
      status: r.status as 'pending' | 'called',
    }))

    // queue positions across ALL pending
    const { data: pendingAll } = await supabase
      .from('pickup_requests')
      .select('student_id, request_time')
      .eq('status', 'pending')
      .order('request_time', { ascending: true })

    const order = (pendingAll || []).map((r: any) => r.student_id as string)
    const positions: Record<string, number> = {}
    formatted.forEach((r) => {
      if (r.status === 'pending') {
        const idx = order.indexOf(r.studentId)
        if (idx >= 0) positions[r.studentId] = idx + 1
      }
    })
    formatted.sort((a, b) =>
      a.studentId.localeCompare(b.studentId) || a.id.localeCompare(b.id)
    )
    setActiveRequests((prev) =>
      prev.length === formatted.length &&
      prev.every(
        (r, i) =>
          r.id === formatted[i].id &&
          r.studentId === formatted[i].studentId &&
          r.status === formatted[i].status
      )
        ? prev
        : formatted
    )
    setQueuePositions((prev) => {
      const same =
        Object.keys(prev).length === Object.keys(positions).length &&
        Object.entries(positions).every(([k, v]) => prev[k] === v)
      return same ? prev : positions
    })
  }, [])

  useEffect(() => {
    fetchStudents()
    fetchActiveRequests()
  }, [fetchStudents, fetchActiveRequests])

  // ---------- ACTIONS ----------
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const toggleSelect = (id: string, disabled: boolean) => {
    if (disabled) return
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const handleRequestPickup = async () => {
    if (selectedStudentIds.length === 0) return
    setLoading(true)
    try {
      const { data: parentId, error: parentError } = await supabase.rpc('get_current_parent_id')
      if (parentError || !parentId) throw new Error('Unable to determine current parent')
      // Prefer cached helper when available
      const cachedParentId = await getCurrentParentIdCached()
      const effectiveParentId = cachedParentId || parentId

      for (const studentId of selectedStudentIds) {
        const { data: isAuthorized, error: authError } = await supabase.rpc(
          'is_parent_of_student',
          { student_id: studentId }
        )
        if (authError) throw new Error('Authorization check failed')
        if (!isAuthorized) throw new Error('Not authorized for this student')

        const { error } = await supabase.from('pickup_requests').insert({
          student_id: studentId,
          parent_id: effectiveParentId,
          status: 'pending',
          request_time: new Date().toISOString(),
        })
        if (error) throw error
      }

      setSelectedStudentIds([])
      fetchActiveRequests()
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (requestId: string) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('pickup_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId)
      if (error) throw error
      Alert.alert('Cancelled', 'Pickup request cancelled')
      fetchActiveRequests()
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Cancel failed')
    } finally {
      setLoading(false)
    }
  }

  // live updates
  useEffect(() => {
    const handleChange = (payload: any) => {
      const id = payload.new?.student_id || payload.old?.student_id
      if (id && studentsRef.current.some((s) => s.id === id)) {
        fetchActiveRequests()
      }
    }

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
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchActiveRequests])

  // poll backend every 10s when there are active requests
  useEffect(() => {
    if (activeRequests.length > 0) {
      if (!pollRef.current) {
        pollRef.current = setInterval(() => {
          fetchActiveRequests()
        }, 10000)
      }
    } else if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [activeRequests, fetchActiveRequests])

  // notify when a student is on the way and app is not active
  useEffect(() => {
    activeRequests
      .filter((r) => r.status === 'called')
      .forEach((r) => {
        if (!notifiedRef.current.has(r.studentId)) {
          notifiedRef.current.add(r.studentId)
          if (AppState.currentState !== 'active') {
            const st = studentsRef.current.find((s) => s.id === r.studentId)
            Notifications.scheduleNotificationAsync({
              content: {
                title: 'Student on the way',
                body: `${st?.name ?? 'Student'} is on the way`,
              },
              trigger: null,
            })
          }
        }
      })

    const calledIds = activeRequests
      .filter((r) => r.status === 'called')
      .map((r) => r.studentId)
    notifiedRef.current.forEach((id) => {
      if (!calledIds.includes(id)) {
        notifiedRef.current.delete(id)
      }
    })
  }, [activeRequests])

  const initials = session.user.email?.[0]?.toUpperCase?.() || 'U'

  const Section = ({ title, data, authorized }: { title: string; data: Student[]; authorized: boolean }) => (
    data.length === 0 ? null : (
      <Card padding="$4" elevate bordered borderRadius="$6" space>
        <XStack alignItems="center" justifyContent="space-between" marginBottom="$2">
          <Text fontWeight="bold">{title}</Text>
          <Text fontSize={12} opacity={0.6}>{data.length}</Text>
        </XStack>
        {data.map((item) => {
          const request = activeRequests.find((r) => r.studentId === item.id)
          const disabled = !!request
          return (
            <ListItem
              key={item.id}
              pressTheme
              borderRadius="$6"
              paddingVertical="$3"
              onPress={() => toggleSelect(item.id, disabled)}
              backgroundColor={selectedStudentIds.includes(item.id) ? '$blue3' : undefined}
              borderWidth={selectedStudentIds.includes(item.id) ? 2 : 0}
              borderColor="$blue7"
              icon={
                <Avatar circular size="$3">
                  <Avatar.Fallback backgroundColor="$blue5">
                    <Text color="white">{item.name?.[0]?.toUpperCase?.() || 'S'}</Text>
                  </Avatar.Fallback>
                </Avatar>
              }
              title={item.name}
              subTitle={`${item.className ?? 'Class'} • ${item.teacher ?? 'Teacher'}`}
              iconAfter={
                request
                  ? request.status === 'pending'
                    ? (
                        <Button size="$2" borderRadius="$6" onPress={() => handleCancel(request.id)}>
                          Cancel
                        </Button>
                      )
                    : null
                  : null
              }
            />
          )
        })}
      </Card>
    )
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#3b82f6' }}>
      <StatusBar barStyle="light-content" backgroundColor="#3b82f6" />
      <Theme name="light">
        <YStack flex={1} padding="$4" space backgroundColor="white">
          {/* Header */}
          <Card
            backgroundColor="#3b82f6"
            borderRadius="$8"
            padding="$3"
            elevate
            marginBottom="$4"
          >
            <XStack alignItems="center" justifyContent="space-between">
              <XStack alignItems="center" space="$3">
                <Avatar circular size="$4">
                  <Avatar.Fallback backgroundColor="white">
                    <Text color="#3b82f6" fontWeight="bold">{initials}</Text>
                  </Avatar.Fallback>
                </Avatar>
                <YStack>
                  <Text fontWeight="bold" numberOfLines={1} color="white">Hi!</Text>
                  <Paragraph size="$2" color="white" opacity={0.8} numberOfLines={1}>
                    {session.user.email}
                  </Paragraph>
                </YStack>
              </XStack>
              <Button
                size="$3"
                borderRadius="$6"
                backgroundColor="white"
                color="#3b82f6"
                onPress={() => setMenuOpen(true)}
              >
                ☰
              </Button>
            </XStack>
          </Card>

          {/* Active status */}
          <PickupStatus students={students} requests={activeRequests} />

          {/* Lists */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchStudents} />}>
            <Section title="Your children" data={students.filter((s) => !s.isAuthorized)} authorized={false} />
            <Separator marginVertical="$3" />
            <Section title="Authorized to pick up" data={students.filter((s) => s.isAuthorized)} authorized={true} />
            {students.length === 0 && (
              <Text textAlign="center" marginTop="$8">No students found.</Text>
            )}
          </ScrollView>

          {/* Floating Primary Action */}
          <Button
            size="$6"
            borderRadius="$10"
            onPress={handleRequestPickup}
            disabled={selectedStudentIds.length === 0 || loading}
            icon={loading ? <Spinner /> : null}
            backgroundColor="#3b82f6"
            color="white"
            pressStyle={{ backgroundColor: '#1e40af' }}
            style={{ position: 'absolute', bottom: 24, left: 16, right: 16 }}
          >
            {loading
              ? 'Requesting…'
              : selectedStudentIds.length > 0
              ? `Request Pickup (${selectedStudentIds.length})`
              : 'Request Pickup'}
          </Button>
        </YStack>

        {/* Menu Sheet */}
        <MenuSheet
          open={menuOpen}
          onOpenChange={setMenuOpen}
          onLogout={handleLogout}
        />
      </Theme>
    </SafeAreaView>
  )
}