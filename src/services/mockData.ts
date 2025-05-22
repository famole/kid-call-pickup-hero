
import { Child, Class, User, PickupRequest } from '@/types';

// Utility to generate deterministic UUIDs for testing
let uuidCounter = 0;
export function generateMockUUID(): string {
  uuidCounter += 1;
  const hex = uuidCounter.toString(16).padStart(12, '0');
  return `00000000-0000-0000-0000-${hex}`;
}

// Mock classes with deterministic UUIDs
const class1Id = generateMockUUID();
const class2Id = generateMockUUID();
const class3Id = generateMockUUID();

export const classes: Class[] = [
  { id: class1Id, name: 'Class 1A', grade: '1st Grade', teacher: 'Ms. Smith' },
  { id: class2Id, name: 'Class 2B', grade: '2nd Grade', teacher: 'Mr. Johnson' },
  { id: class3Id, name: 'Class 3C', grade: '3rd Grade', teacher: 'Mrs. Williams' },
];

// Mock parents
const parent1Id = generateMockUUID();
const parent2Id = generateMockUUID();

export const parents: User[] = [
  {
    id: parent1Id,
    email: 'parent@example.com',
    name: 'John Doe',
    role: 'parent',
  },
  {
    id: parent2Id,
    email: 'parent2@example.com',
    name: 'Jane Smith',
    role: 'parent',
  }
];

// Mock admins
const adminId = generateMockUUID();

export const admins: User[] = [
  {
    id: adminId,
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin',
  }
];

// Mock children
const child1Id = generateMockUUID();
const child2Id = generateMockUUID();
const child3Id = generateMockUUID();
const child4Id = generateMockUUID();

export const children: Child[] = [
  {
    id: child1Id,
    name: 'Emma Doe',
    classId: class1Id,
    parentIds: [parent1Id],
  },
  {
    id: child2Id,
    name: 'Liam Doe',
    classId: class2Id,
    parentIds: [parent1Id],
  },
  {
    id: child3Id,
    name: 'Olivia Smith',
    classId: class1Id,
    parentIds: [parent2Id],
  },
  {
    id: child4Id,
    name: 'Noah Smith',
    classId: class3Id,
    parentIds: [parent2Id],
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
    id: generateMockUUID(),
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
