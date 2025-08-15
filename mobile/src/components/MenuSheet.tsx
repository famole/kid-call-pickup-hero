import React from 'react'
import { Sheet, Button, Text, YStack } from 'tamagui'
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onLogout: () => void
}

export default function MenuSheet({ open, onOpenChange, onLogout }: Props) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>()
  return (
    <Sheet modal open={open} onOpenChange={onOpenChange} snapPoints={[40]}>
      <Sheet.Overlay />
      <Sheet.Handle />
      <Sheet.Frame padding="$4" alignItems="center" gap="$4" borderRadius="$6">
        <Text fontSize="$7" fontWeight="bold">Upsy</Text>
        <YStack width="100%" space="$3">
          <Button
            size="$4"
            borderRadius="$6"
            width="100%"
            onPress={() => {
              onOpenChange(false)
              navigation.navigate('Authorizations')
            }}
          >
            Pickup Authorizations
          </Button>
          <Button
            size="$4"
            borderRadius="$6"
            width="100%"
            theme="red"
            onPress={onLogout}
          >
            Logout
          </Button>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  )
}
