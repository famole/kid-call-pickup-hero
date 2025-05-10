
import { Child, Class, User, PickupRequest } from '@/types';

// Mock classes
export const classes: Class[] = [
  { id: '1', name: 'Class 1A', grade: '1st Grade', teacher: 'Ms. Smith' },
  { id: '2', name: 'Class 2B', grade: '2nd Grade', teacher: 'Mr. Johnson' },
  { id: '3', name: 'Class 3C', grade: '3rd Grade', teacher: 'Mrs. Williams' },
];

// Mock parents
export const parents: User[] = [
  {
    id: '1',
    email: 'parent@example.com',
    name: 'John Doe',
    role: 'parent',
  },
  {
    id: '2',
    email: 'parent2@example.com',
    name: 'Jane Smith',
    role: 'parent',
  }
];

// Mock admins
export const admins: User[] = [
  {
    id: 'admin1',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
  }
];

// Mock children
export const children: Child[] = [
  {
    id: '1',
    name: 'Emma Doe',
    classId: '1',
    parentIds: ['1'],
  },
  {
    id: '2',
    name: 'Liam Doe',
    classId: '2',
    parentIds: ['1'],
  },
  {
    id: '3',
    name: 'Olivia Smith',
    classId: '1',
    parentIds: ['2'],
  },
  {
    id: '4',
    name: 'Noah Smith',
    classId: '3',
    parentIds: ['2'],
  },
];

// Mock pickup requests
export const pickupRequests: PickupRequest[] = [];

// Helper functions to get data
export const getChildrenForParent = (parentId: string) => {
  return children.filter(child => child.parentIds.includes(parentId));
};

export const getClassById = (id: string) => {
  return classes.find(cls => cls.id === id);
};

export const getChildById = (id: string) => {
  return children.find(child => child.id === id);
};

// Add the getAllStudents function
export const getAllStudents = (): Child[] => {
  return [...children];
};

export const createPickupRequest = (childId: string, parentId: string): PickupRequest => {
  const request: PickupRequest = {
    id: Date.now().toString(),
    childId,
    parentId,
    requestTime: new Date(),
    status: 'pending'
  };
  
  pickupRequests.push(request);
  return request;
};

export const updatePickupRequestStatus = (id: string, status: PickupRequest['status']) => {
  const index = pickupRequests.findIndex(req => req.id === id);
  if (index !== -1) {
    pickupRequests[index].status = status;
    return pickupRequests[index];
  }
  return null;
};

export const getActivePickupRequests = () => {
  return pickupRequests.filter(req => req.status === 'pending' || req.status === 'called');
};

export const getCurrentlyCalled = () => {
  return pickupRequests
    .filter(req => req.status === 'called')
    .map(req => {
      const child = getChildById(req.childId);
      const classInfo = child ? getClassById(child.classId) : null;
      return { request: req, child, class: classInfo };
    });
};
