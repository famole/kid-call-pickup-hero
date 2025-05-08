
import { User } from '@/types';

export type AuthState = {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
};

export type AuthContextType = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};
