
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
  getParentsWithStudents,
} from './parent/studentParentRelations';

export {
  importParentsFromCSV,
} from './parent/parentImport';
