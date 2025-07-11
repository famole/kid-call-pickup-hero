
export interface SelfCheckoutAuthorization {
  id: string;
  studentId: string;
  authorizingParentId: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SelfCheckoutAuthorizationWithDetails {
  id: string;
  studentId: string;
  authorizingParentId: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  student?: {
    id: string;
    name: string;
    classId: string;
    avatar?: string;
  };
  authorizingParent?: {
    id: string;
    name: string;
    email: string;
  };
  class?: {
    id: string;
    name: string;
    grade: string;
    teacher: string;
  };
}

export interface StudentDeparture {
  id: string;
  studentId: string;
  departedAt: Date;
  markedByUserId: string;
  notes?: string;
  createdAt: Date;
}

export interface StudentDepartureWithDetails {
  id: string;
  studentId: string;
  departedAt: Date;
  markedByUserId: string;
  notes?: string;
  createdAt: Date;
  student?: {
    id: string;
    name: string;
    classId: string;
    avatar?: string;
  };
  class?: {
    id: string;
    name: string;
    grade: string;
    teacher: string;
  };
  markedByUser?: {
    id: string;
    name: string;
    email: string;
  };
}
