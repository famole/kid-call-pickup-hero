// Main parentService file - re-exports all functionality for backward compatibility
export {
  getAllParents,
  getParentById,
  createParent,
  updateParent,
  deleteParent,
} from './parent/parentOperations';

export {
  addStudentToParent,
  removeStudentFromParent,
  updateStudentParentRelationship,
  getStudentsForParent,
} from './parent/studentParentRelations';

// Use the optimized version by default
export { getParentsWithStudentsOptimized as getParentsWithStudents } from './parent/optimizedParentOperations';

// Keep the original for backward compatibility if needed
export { getParentsWithStudents as getParentsWithStudentsLegacy } from './parent/studentParentRelations';

export {
  importParentsFromCSV,
} from './parent/parentImport';
