import React, { useEffect, useState } from 'react'
import {
  YStack,
  XStack,
  Button,
  Text,
  ListItem,
  Theme,
  Card,
  Spinner,
  Input,
  ScrollView,
  Sheet
} from 'tamagui'
import { Alert } from 'react-native'
import { supabase } from '../supabaseClient'
import {
  getPickupAuthorizationsForParent,
  createPickupAuthorization,
  updatePickupAuthorization,
  deletePickupAuthorization,
  PickupAuthorizationWithDetails
} from '../../src/services/pickupAuthorizationService'
import { getStudentsForParent } from '../../src/services/studentService'
import { getAllParents } from '../../src/services/parentService'

interface FormData {
  studentId: string
  authorizedParentId: string
  startDate: string
  endDate: string
}

export default function AuthorizationsScreen() {
  const [authorizations, setAuthorizations] = useState<PickupAuthorizationWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<PickupAuthorizationWithDetails | null>(null)
  const [children, setChildren] = useState<{ id: string; name: string }[]>([])
  const [parents, setParents] = useState<{ id: string; name: string }[]>([])
  const [formData, setFormData] = useState<FormData>({
    studentId: '',
    authorizedParentId: '',
    startDate: '',
    endDate: ''
  })

  useEffect(() => {
    loadAuthorizations()
  }, [])

  const loadAuthorizations = async () => {
    setLoading(true)
    try {
      const data = await getPickupAuthorizationsForParent()
      setAuthorizations(data)
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load authorizations')
    } finally {
      setLoading(false)
    }
  }

  const loadParentsChildren = async () => {
    try {
      const { data: parentId, error } = await supabase.rpc('get_current_parent_id')
      if (error || !parentId) return
      const kids = await getStudentsForParent(parentId)
      setChildren(kids)
      const all = await getAllParents()
      const others = all.filter(p => p.id !== parentId)
      setParents(others)
    } catch {}
  }

  const openAdd = async () => {
    setFormData({ studentId: '', authorizedParentId: '', startDate: '', endDate: '' })
    await loadParentsChildren()
    setAddOpen(true)
  }

  const openEdit = async (auth: PickupAuthorizationWithDetails) => {
    setEditing(auth)
    setFormData({
      studentId: auth.studentId,
      authorizedParentId: auth.authorizedParentId,
      startDate: auth.startDate,
      endDate: auth.endDate
    })
    await loadParentsChildren()
    setEditOpen(true)
  }

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAdd = async () => {
    if (!formData.studentId || !formData.authorizedParentId || !formData.startDate || !formData.endDate) {
      Alert.alert('Error', 'Please fill all fields')
      return
    }
    setLoading(true)
    try {
      await createPickupAuthorization({
        studentId: formData.studentId,
        authorizedParentId: formData.authorizedParentId,
        startDate: formData.startDate,
        endDate: formData.endDate
      })
      setAddOpen(false)
      loadAuthorizations()
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to create authorization')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async () => {
    if (!editing) return
    if (!formData.studentId || !formData.authorizedParentId || !formData.startDate || !formData.endDate) {
      Alert.alert('Error', 'Please fill all fields')
      return
    }
    setLoading(true)
    try {
      await updatePickupAuthorization(editing.id, {
        studentId: formData.studentId,
        authorizedParentId: formData.authorizedParentId,
        startDate: formData.startDate,
        endDate: formData.endDate
      })
      setEditOpen(false)
      setEditing(null)
      loadAuthorizations()
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update authorization')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    setLoading(true)
    try {
      await deletePickupAuthorization(id)
      setAuthorizations(prev => prev.filter(a => a.id !== id))
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to delete authorization')
    } finally {
      setLoading(false)
    }
  }

  const renderForm = (onSubmit: () => void) => (
    <YStack padding="$4" space>
      <Text fontWeight="bold">Child</Text>
      <ScrollView style={{ maxHeight: 150 }}>
        {children.map(c => (
          <ListItem
            key={c.id}
            onPress={() => handleChange('studentId', c.id)}
            borderWidth={formData.studentId === c.id ? 2 : 0}
            borderColor="$blue7"
            borderRadius="$4"
            pressStyle={{ scale: 0.97 }}
          >
            {c.name}
          </ListItem>
        ))}
      </ScrollView>
      <Text fontWeight="bold">Parent</Text>
      <ScrollView style={{ maxHeight: 150 }}>
        {parents.map(p => (
          <ListItem
            key={p.id}
            onPress={() => handleChange('authorizedParentId', p.id)}
            borderWidth={formData.authorizedParentId === p.id ? 2 : 0}
            borderColor="$blue7"
            borderRadius="$4"
            pressStyle={{ scale: 0.97 }}
          >
            {p.name}
          </ListItem>
        ))}
      </ScrollView>
      <Input
        placeholder="Start YYYY-MM-DD"
        value={formData.startDate}
        onChangeText={v => handleChange('startDate', v)}
      />
      <Input
        placeholder="End YYYY-MM-DD"
        value={formData.endDate}
        onChangeText={v => handleChange('endDate', v)}
      />
      <Button onPress={onSubmit} disabled={loading} icon={loading ? <Spinner /> : null} borderRadius="$4">
        {loading ? 'Saving...' : 'Save'}
      </Button>
      <Button onPress={() => { setAddOpen(false); setEditOpen(false); }} variant="outlined" borderRadius="$4">
        Cancel
      </Button>
    </YStack>
  )

  return (
    <Theme name="light">
      <YStack flex={1} padding="$4" space>
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize="$7" fontWeight="bold">Authorizations</Text>
          <Button size="$4" borderRadius="$4" onPress={openAdd}>Add</Button>
        </XStack>
        {loading && authorizations.length === 0 ? (
          <Spinner size="large" />
        ) : (
          <ScrollView>
            {authorizations.map(auth => (
              <Card key={auth.id} padding="$4" marginBottom="$2" borderRadius="$4" bordered>
                <YStack space>
                  <Text fontWeight="bold">{auth.student?.name || 'Child'}</Text>
                  <Text>Authorized: {auth.authorizedParent?.name}</Text>
                  <Text>{auth.startDate} - {auth.endDate}</Text>
                  <XStack space>
                    <Button size="$3" onPress={() => openEdit(auth)} borderRadius="$4">Edit</Button>
                    <Button size="$3" onPress={() => handleDelete(auth.id)} borderRadius="$4" theme="red">Delete</Button>
                  </XStack>
                </YStack>
              </Card>
            ))}
          </ScrollView>
        )}
        <Sheet modal open={addOpen} onOpenChange={setAddOpen} snapPoints={[85]}>
          <Sheet.Overlay />
          <Sheet.Handle />
          <Sheet.Frame>
            {renderForm(handleAdd)}
          </Sheet.Frame>
        </Sheet>
        <Sheet modal open={editOpen} onOpenChange={setEditOpen} snapPoints={[85]}>
          <Sheet.Overlay />
          <Sheet.Handle />
          <Sheet.Frame>
            {renderForm(handleEdit)}
          </Sheet.Frame>
        </Sheet>
      </YStack>
    </Theme>
  )
}
