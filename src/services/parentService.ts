// Main parentService file - re-exports all functionality for backward compatibility
export {
  getAllParents,
  getParentById,
  createParent,
  updateParent,
  deleteParent,
  reactivateParent,
  resetParentPassword,
} from './parent/parentOperations';

export {
  addStudentToParent,
  removeStudentFromParent,
  updateStudentParentRelationship,
  getStudentsForParent,
} from './parent/studentParentRelations';

// Use the new optimized version by default
export { 
  getParentsWithStudentsOptimized as getParentsWithStudents,
  getParentDashboardDataOptimized 
} from './parent/optimizedParentQueries';

// Keep the original for backward compatibility if needed
export { getParentsWithStudents as getParentsWithStudentsLegacy } from './parent/studentParentRelations';

export {
  importParentsFromCSV,
} from './parent/parentImport';
