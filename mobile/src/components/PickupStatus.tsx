import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
  if (requests.length === 0) return null;

  const pending = requests.filter(r => r.status === 'pending');
  const called = requests.filter(r => r.status === 'called');

  const getName = (id: string) => students.find(s => s.id === id)?.name || 'Unknown';

  return (
    <View style={styles.container}>
      {pending.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>In Queue</Text>
          {pending.map(req => (
            <Text key={req.studentId} style={styles.item}>
              {getName(req.studentId)}
            </Text>
          ))}
        </View>
      )}
      {called.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Called - On the Way</Text>
          {called.map(req => (
            <Text key={req.studentId} style={styles.item}>
              {getName(req.studentId)}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  item: {
    paddingVertical: 4,
  },
});
