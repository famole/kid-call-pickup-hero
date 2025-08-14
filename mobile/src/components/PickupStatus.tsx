
import React from 'react'
import { YStack, Text, Paragraph, Theme, Card, AnimatePresence } from 'tamagui'

interface Student {
  id: string;
  name: string;
  className?: string | null;
  teacher?: string | null;
}

interface Request {
  studentId: string;
  status: 'pending' | 'called';
}

interface Props {
  students: Student[];
  requests: Request[];
  currentParentId?: string;
}

export default function PickupStatus({ students, requests, currentParentId }: Props) {
  if (!requests || requests.length === 0) return null

  const pending = requests.filter(r => r.status === 'pending')
  const called = requests.filter(r => r.status === 'called')

  const getName = (id: string) => students.find(s => s.id === id)?.name || 'Unknown'

  return (
    <Theme name="light">
      <Card marginBottom="$4" padding="$4" borderRadius="$4" bordered>
        <YStack space>
          <AnimatePresence>
            {pending.length > 0 && (
              <YStack
                key="pending"
                space
                animation="quick"
                enterStyle={{ opacity: 0, scale: 0.95 }}
                exitStyle={{ opacity: 0, scale: 0.95 }}
              >
                <Text fontWeight="bold">In Queue</Text>
                <AnimatePresence>
                  {pending.map(req => (
                    <Paragraph
                      key={req.studentId}
                      animation="quick"
                      enterStyle={{ opacity: 0, x: -10 }}
                      exitStyle={{ opacity: 0, x: 10 }}
                    >
                      {getName(req.studentId)}
                    </Paragraph>
                  ))}
                </AnimatePresence>
              </YStack>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {called.length > 0 && (
              <YStack
                key="called"
                space
                animation="quick"
                enterStyle={{ opacity: 0, scale: 0.95 }}
                exitStyle={{ opacity: 0, scale: 0.95 }}
              >
                <Text fontWeight="bold">Called - On the Way</Text>
                <AnimatePresence>
                  {called.map(req => (
                    <Paragraph
                      key={req.studentId}
                      animation="quick"
                      enterStyle={{ opacity: 0, x: -10 }}
                      exitStyle={{ opacity: 0, x: 10 }}
                    >
                      {getName(req.studentId)}
                    </Paragraph>
                  ))}
                </AnimatePresence>
              </YStack>
            )}
          </AnimatePresence>
        </YStack>
      </Card>
    </Theme>
  )
}
