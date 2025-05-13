
import { Child, Class, User, PickupRequest } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Mock classes
export const classes: Class[] = [
  { id: uuidv4(), name: 'Class 1A', grade: '1st Grade', teacher: 'Ms. Smith' },
  { id: uuidv4(), name: 'Class 2B', grade: '2nd Grade', teacher: 'Mr. Johnson' },
  { id: uuidv4(), name: 'Class 3C', grade: '3rd Grade', teacher: 'Mrs. Williams' },
];

// Mock parents
export const parents: User[] = [
  {
    id: uuidv4(),
    email: 'parent@example.com',
    name: 'John Doe',
    role: 'parent',
  },
  {
    id: uuidv4(),
    email: 'parent2@example.com',
    name: 'Jane Smith',
    role: 'parent',
  }
];

// Mock admins
export const admins: User[] = [
  {
    id: uuidv4(),
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
  }
];

// Mock children
export const children: Child[] = [
  {
    id: uuidv4(),
    name: 'Emma Doe',
    classId: classes[0].id,
    parentIds: [parents[0].id],
  },
  {
    id: uuidv4(),
    name: 'Liam Doe',
    classId: classes[1].id,
    parentIds: [parents[0].id],
  },
  {
    id: uuidv4(),
    name: 'Olivia Smith',
    classId: classes[0].id,
    parentIds: [parents[1].id],
  },
  {
    id: uuidv4(),
    name: 'Noah Smith',
    classId: classes[2].id,
    parentIds: [parents[1].id],
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
    id: uuidv4(),
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
