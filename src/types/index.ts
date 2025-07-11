
export type User = {
  id: string;
  email: string;
  name: string;
  role: 'parent' | 'admin' | 'teacher' | 'superadmin';
  avatar?: string;
};

export type Child = {
  id: string;
  name: string;
  classId: string;
  parentIds: string[];
  avatar?: string;
  isAuthorized?: boolean;
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
};

export type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
};
