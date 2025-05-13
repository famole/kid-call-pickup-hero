
import { User } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Mock data for development when Supabase auth is not set up
export const mockUsers: User[] = [
  {
    id: uuidv4(),
    email: 'parent@example.com',
    name: 'Parent User',
    role: 'parent',
  },
  {
    id: uuidv4(),
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
  }
];
