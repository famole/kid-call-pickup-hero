
import { getAllStudents, getStudentById, getStudentsForParent } from './getStudents';
import { createStudent, updateStudent, deleteStudent } from './modifyStudents';
import { migrateStudentsToSupabase } from './migrationUtils';

export {
  getAllStudents,
  getStudentById,
  getStudentsForParent,
  createStudent,
  updateStudent,
  deleteStudent,
  migrateStudentsToSupabase
};
