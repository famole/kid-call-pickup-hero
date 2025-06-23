import React from 'react'
import { YStack, Text, Paragraph, Theme } from 'tamagui'

interface Student {
  id: string;
  name: string;
}

interface Request {
  studentId: string;
  status: 'pending' | 'called';
}

interface Props {
  students: Student[];
  requests: Request[];
}

export default function PickupStatus({ students, requests }: Props) {
  if (requests.length === 0) return null

  const pending = requests.filter(r => r.status === 'pending')
  const called = requests.filter(r => r.status === 'called')

  const getName = (id: string) => students.find(s => s.id === id)?.name || 'Unknown'

  return (
    <Theme name="light">
      <YStack marginBottom="$4" space>
        {pending.length > 0 && (
          <YStack space>
            <Text fontWeight="bold">In Queue</Text>
            {pending.map(req => (
              <Paragraph key={req.studentId}>{getName(req.studentId)}</Paragraph>
            ))}
          </YStack>
        )}
        {called.length > 0 && (
          <YStack space>
            <Text fontWeight="bold">Called - On the Way</Text>
            {called.map(req => (
              <Paragraph key={req.studentId}>{getName(req.studentId)}</Paragraph>
            ))}
          </YStack>
        )}
      </YStack>
    </Theme>
  )
}
