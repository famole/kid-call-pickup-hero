
export type Parent = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: 'parent' | 'teacher' | 'admin' | 'superadmin';
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
};

export type ParentInput = {
  name: string;
  email: string;
  phone?: string;
  role?: 'parent' | 'teacher' | 'admin' | 'superadmin';
  is_preloaded?: boolean;
  password_set?: boolean;
};

export type StudentParentRelationship = {
  id: string;
  studentId: string;
  parentId: string;
  relationship?: string;
  isPrimary: boolean;
  createdAt: Date;
};

export type ParentWithStudents = Parent & {
  students?: {
    id: string; // Student's ID
    name: string;
    isPrimary: boolean;
    relationship?: string;
    parentRelationshipId?: string; // The ID of the student_parents table row
    classId?: string; // Add classId for filtering
    className?: string; // Add className for display
    grade?: string; // Add grade for display
    avatar?: string; // Add avatar for display
  }[];
};
