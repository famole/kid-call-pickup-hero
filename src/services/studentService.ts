
// No changes needed here if it already exports getAllStudents correctly.
// The change was to rename the import in the page components.
// Assuming studentService.ts correctly exports a function named getAllStudents from student/index.ts
// which in turn exports it from student/getStudents.ts.

// Example:
// export { getAllStudents } from './student'; // or './student/getStudents'

// Let's verify the existing studentService.ts structure based on previous context.
// It seems it re-exports from './student'.

import {
  getAllStudents,
  getStudentById,
  getStudentsForParent,
  createStudent,
  updateStudent,
  deleteStudent,
  migrateStudentsToSupabase
} from './student'; // This should point to src/services/student/index.ts

export {
  getAllStudents,
  getStudentById,
  getStudentsForParent,
  createStudent,
  updateStudent,
  deleteStudent,
  migrateStudentsToSupabase
};
