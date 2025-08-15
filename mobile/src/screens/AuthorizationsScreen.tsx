import React, { useEffect, useState } from 'react'
import {
  YStack,
  XStack,
  Button,
  Text,
  Theme,
  Card,
  Spinner,
  Input,
  ScrollView,
  Sheet,
  ListItem,
  Paragraph,
  Separator,
  Avatar
} from 'tamagui'
import { Alert } from 'react-native'
import { supabase } from '../supabaseClient'
import {
  getPickupAuthorizationsForParent,
  createPickupAuthorization,
  updatePickupAuthorization,
  deletePickupAuthorization,
  PickupAuthorizationWithDetails,
} from '../../../src/services/pickupAuthorizationService'
import { getStudentsForParent } from '../../../src/services/studentService'
import { getAllParents } from '../../../src/services/parentService'
import MenuSheet from '../components/MenuSheet'

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
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState<PickupAuthorizationWithDetails | null>(null)
  const [children, setChildren] = useState<{ id: string; name: string }[]>([])
  const [parents, setParents] = useState<{ id: string; name: string }[]>([])
  const [formData, setFormData] = useState<FormData>({
    studentId: '',
    authorizedParentId: '',
    startDate: '',
    endDate: '',
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
      const others = all.filter((p) => p.id !== parentId)
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
      endDate: auth.endDate,
    })
    await loadParentsChildren()
    setEditOpen(true)
  }

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
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
        endDate: formData.endDate,
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
        endDate: formData.endDate,
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
      setAuthorizations((prev) => prev.filter((a) => a.id !== id))
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to delete authorization')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const SelectorList = ({
    data,
    selectedId,
    onSelect,
    emptyLabel,
  }: {
    data: { id: string; name: string }[]
    selectedId: string
    onSelect: (id: string) => void
    emptyLabel: string
  }) => (
    <ScrollView style={{ maxHeight: 180 }}>
      {data.length === 0 ? (
        <Paragraph opacity={0.6} textAlign="center">{emptyLabel}</Paragraph>
      ) : (
        data.map((row) => (
          <ListItem
            key={row.id}
            onPress={() => onSelect(row.id)}
            borderRadius="$6"
            pressTheme
            backgroundColor={selectedId === row.id ? '$blue3' : undefined}
            borderWidth={selectedId === row.id ? 2 : 0}
            borderColor="$blue7"
            icon={
              <Avatar circular size="$3">
                <Avatar.Fallback backgroundColor="$blue5">
                  <Text color="white">{row.name?.[0]?.toUpperCase?.() || 'U'}</Text>
                </Avatar.Fallback>
              </Avatar>
            }
            title={row.name}
          />
        ))
      )}
    </ScrollView>
  )

  const renderForm = (onSubmit: () => void) => (
    <YStack padding="$4" space>
      <Text fontWeight="bold">Child</Text>
      <SelectorList data={children} selectedId={formData.studentId} onSelect={(v) => handleChange('studentId', v)} emptyLabel="No children found" />
      <Text fontWeight="bold">Parent</Text>
      <SelectorList data={parents} selectedId={formData.authorizedParentId} onSelect={(v) => handleChange('authorizedParentId', v)} emptyLabel="No parents found" />
      <Input placeholder="Start YYYY-MM-DD" value={formData.startDate} onChangeText={(v) => handleChange('startDate', v)} borderRadius="$6" size="$5" />
      <Input placeholder="End YYYY-MM-DD" value={formData.endDate} onChangeText={(v) => handleChange('endDate', v)} borderRadius="$6" size="$5" />
      <Button onPress={onSubmit} disabled={loading} icon={loading ? <Spinner /> : null} borderRadius="$6" size="$5">
        {loading ? 'Saving…' : 'Save'}
      </Button>
      <Button onPress={() => { setAddOpen(false); setEditOpen(false); }} variant="outlined" borderRadius="$6" size="$5">Cancel</Button>
    </YStack>
  )

  return (
    <Theme name="light">
      <YStack flex={1} padding="$4" space>
        <XStack alignItems="center" justifyContent="space-between">
          <Button size="$3" borderRadius="$6" onPress={() => setMenuOpen(true)}>☰</Button>
          <Text flex={1} textAlign="center" fontSize="$7" fontWeight="bold">Authorizations</Text>
          <Button size="$4" borderRadius="$6" onPress={openAdd}>Add</Button>
        </XStack>

        {loading && authorizations.length === 0 ? (
          <Spinner size="large" />
        ) : (
          <ScrollView>
            {authorizations.map((auth) => (
              <Card key={auth.id} padding="$4" marginBottom="$3" borderRadius="$6" bordered elevate>
                <YStack space>
                  <XStack alignItems="center" justifyContent="space-between">
                    <XStack space alignItems="center">
                      <Avatar circular size="$3">
                        <Avatar.Fallback backgroundColor="$blue7">
                          <Text color="white">{auth.student?.name?.[0]?.toUpperCase?.() || 'S'}</Text>
                        </Avatar.Fallback>
                      </Avatar>
                      <YStack>
                        <Text fontWeight="bold">{auth.student?.name || 'Child'}</Text>
                        <Paragraph size="$2" opacity={0.7}>Authorized: {auth.authorizedParent?.name}</Paragraph>
                      </YStack>
                    </XStack>
                    <XStack space>
                      <Button size="$3" borderRadius="$6" onPress={() => openEdit(auth)}>Edit</Button>
                      <Button size="$3" borderRadius="$6" theme="red" onPress={() => handleDelete(auth.id)}>Delete</Button>
                    </XStack>
                  </XStack>
                  <Separator />
                  <XStack space justifyContent="space-between">
                    <Card paddingHorizontal="$2" paddingVertical={4} borderRadius="$10" bordered>
                      <Text fontSize={12}>{auth.startDate}</Text>
                    </Card>
                    <Card paddingHorizontal="$2" paddingVertical={4} borderRadius="$10" bordered>
                      <Text fontSize={12}>{auth.endDate}</Text>
                    </Card>
                  </XStack>
                </YStack>
              </Card>
            ))}
          </ScrollView>
        )}

        {/* Add */}
        <Sheet modal open={addOpen} onOpenChange={setAddOpen} snapPoints={[85]}>
          <Sheet.Overlay />
          <Sheet.Handle />
          <Sheet.Frame>
            {renderForm(handleAdd)}
          </Sheet.Frame>
        </Sheet>

        {/* Edit */}
        <Sheet modal open={editOpen} onOpenChange={setEditOpen} snapPoints={[85]}>
          <Sheet.Overlay />
          <Sheet.Handle />
          <Sheet.Frame>
            {renderForm(handleEdit)}
          </Sheet.Frame>
        </Sheet>

        <MenuSheet
          open={menuOpen}
          onOpenChange={setMenuOpen}
          onLogout={handleLogout}
        />
      </YStack>
    </Theme>
  )
}