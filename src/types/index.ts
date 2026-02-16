
export type User = {
  id: string;
  email: string | null; // Allow null for username-only users
  name: string;
  role: 'parent' | 'admin' | 'teacher' | 'superadmin' | 'family' | 'other';
  avatar?: string;
  isInvitedUser?: boolean;
  username?: string; // Add username field
};

export type Child = {
  id: string;
  name: string;
  classId: string;
  className?: string;
  parentIds: string[];
  avatar?: string;
  isAuthorized?: boolean;
  deletedAt?: Date;
  status?: 'active' | 'graduated';
  graduationYear?: number;
};

export type Class = {
  id: string;
  name: string;
  grade: string;
  teacher: string;
};

export type PickupRequest = {
  id: string;
  studentId: string;
  parentId: string;
  requestTime: Date;
  status: 'pending' | 'called' | 'completed' | 'cancelled';
  requestingParent?: {
    id: string;
    name: string;
    email: string;
  };
};

export type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>; // Changed from email to identifier
  logout: () => Promise<void>;
  isAuthenticated: boolean;
};
