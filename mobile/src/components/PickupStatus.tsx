// Redesigned PickupStatus.tsx
import React from 'react'
import { YStack, XStack, Text, Paragraph, Theme, Card, Avatar, Separator, AnimatePresence } from 'tamagui'

interface Student {
  id: string
  name: string
  className?: string | null
  teacher?: string | null
}

interface Request {
  studentId: string
  status: 'pending' | 'called'
}

interface Props {
  students: Student[]
  requests: Request[]
  currentParentId?: string
  // Optional queue positions if provided by parent (won't break without it)
  queuePositions?: Record<string, number>
}

export function statusChip(label: string) {
  return (
    <Card paddingHorizontal="$2" paddingVertical={4} borderRadius="$10" bordered>
      <Text fontSize={11}>{label}</Text>
    </Card>
  )
}

export default function PickupStatus({ students, requests, queuePositions }: Props) {
  if (!requests || requests.length === 0) return null

  const pending = requests.filter((r) => r.status === 'pending')
  const called = requests.filter((r) => r.status === 'called')

  const getStudent = (id: string) => students.find((s) => s.id === id)

  const Section = ({ title, data, chipFor }: { title: string; data: Request[]; chipFor: 'pending' | 'called' }) => (
    data.length === 0 ? null : (
      <YStack space>
        <XStack alignItems="center" justifyContent="space-between">
          <Text fontWeight="bold">{title}</Text>
          <Text fontSize={12} opacity={0.6}>{data.length}</Text>
        </XStack>
        <AnimatePresence>
          {data.map((req) => {
            const st = getStudent(req.studentId)
            const initials = st?.name?.[0]?.toUpperCase?.() || 'S'
            const extra = chipFor === 'pending' && queuePositions?.[req.studentId]
              ? `#${queuePositions[req.studentId]}`
              : null
            return (
              <XStack
                key={req.studentId}
                alignItems="center"
                justifyContent="space-between"
                backgroundColor="$backgroundFocus"
                borderRadius="$6"
                padding="$3"
                marginBottom="$2"
                animation="bouncy"
                enterStyle={{ opacity: 0, scale: 0.98 }}
                exitStyle={{ opacity: 0, scale: 0.98 }}
              >
                <XStack space alignItems="center">
                  <Avatar circular size="$3">
                    <Avatar.Fallback backgroundColor={chipFor === 'pending' ? '$blue7' : '$green7'}>
                      <Text color="white">{initials}</Text>
                    </Avatar.Fallback>
                  </Avatar>
                  <YStack>
                    <Text fontWeight="600">{st?.name || 'Unknown'}</Text>
                    {st?.className || st?.teacher ? (
                      <Paragraph size="$2" opacity={0.7}>
                        {st?.className ?? 'Class'} • {st?.teacher ?? 'Teacher'}
                      </Paragraph>
                    ) : null}
                  </YStack>
                </XStack>
                <XStack space="$2" alignItems="center">
                  {extra ? statusChip(extra) : null}
                  {chipFor === 'pending' ? statusChip('In queue') : statusChip('On the way')}
                </XStack>
              </XStack>
            )
          })}
        </AnimatePresence>
      </YStack>
    )
  )

  return (
    <Theme name="light">
      <Card marginBottom="$4" padding="$4" borderRadius="$6" bordered elevate>
        <YStack space>
          <Section title="In Queue" data={pending} chipFor="pending" />
          {pending.length && called.length ? <Separator /> : null}
          <Section title="Called - On the Way" data={called} chipFor="called" />
        </YStack>
      </Card>
    </Theme>
  )
}
