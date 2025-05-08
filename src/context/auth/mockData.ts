
import { User } from '@/types';

// Mock data for development when Supabase auth is not set up
export const mockUsers: User[] = [
  {
    id: '1',
    email: 'parent@example.com',
    name: 'Parent User',
    role: 'parent',
  },
  {
    id: '2',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
  }
];
