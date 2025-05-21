
export type Parent = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ParentInput = {
  name: string;
  email: string;
  phone?: string;
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
    id: string;
    name: string;
    isPrimary: boolean;
    relationship?: string;
    parentRelationshipId?: string;
  }[];
};
