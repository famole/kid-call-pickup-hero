
import { useState } from 'react';
import { Child } from '@/types';

export type NewStudentState = Partial<Omit<Child, 'id' | 'parentIds'> & { parentIds?: string[] }>;


const initialStudentState: NewStudentState = {
  name: '',
  classId: '',
  parentIds: [],
  avatar: undefined,
};

export const useStudentForm = () => {
  const [newStudent, setNewStudent] = useState<NewStudentState>(initialStudentState);

  const resetNewStudent = () => {
    setNewStudent(initialStudentState);
  };

  return {
    newStudent,
    setNewStudent,
    resetNewStudent,
  };
};
