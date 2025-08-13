import { supabase } from "@/integrations/supabase/client";
import { getAllClasses } from "@/services/classService";
import { createParent, updateParent } from "@/services/parent/parentOperations";
import { addStudentToParent } from "@/services/parent/studentParentRelations";
import { createStudent } from "@/services/student/modifyStudents";
import { Class } from "@/types";

export type FullImportInputRow = {
  className?: string | null;
  studentName: string;
  fatherName?: string | null;
  fatherEmail?: string | null;
  motherName?: string | null;
  motherEmail?: string | null;
};

export type ParentAction =
  | { type: 'skip'; reason: string }
  | { type: 'link-existing'; parentId: string; email: string }
  | { type: 'create-new'; payload: { name: string; email: string } }
  | { type: 'update-existing'; parentId: string; email: string; updates: { name?: string } };

export type RowPlan = {
  rowIndex: number;
  studentName: string;
  classNameResolved?: string | null;
  classId?: string | null;
  father: ParentAction;
  mother: ParentAction;
  primaryParent: 'mother' | 'father' | null;
  errors: string[];
};

export type FullImportPreview = {
  rows: RowPlan[];
  stats: {
    students: number;
    createParents: number;
    updateParents: number;
    linkParents: number;
    skippedParents: number;
    errors: number;
  };
  classes: Class[];
};

const fetchExistingParentsByEmails = async (emails: string[]) => {
  const uniqueEmails = Array.from(new Set(emails.filter(Boolean)));
  if (uniqueEmails.length === 0) return [] as any[];
  const { data, error } = await supabase
    .from('parents')
    .select('*')
    .in('email', uniqueEmails);
  if (error) throw new Error(error.message);
  return data || [];
};

export const buildFullImportPreview = async (
  inputRows: FullImportInputRow[],
  selectedClassId?: string | null
): Promise<FullImportPreview> => {
  const classes = await getAllClasses();
  const classByName: Record<string, Class> = classes.reduce((acc, c) => {
    acc[c.name.toLowerCase().trim()] = c;
    return acc;
  }, {} as Record<string, Class>);

  // collect emails
  const allEmails = inputRows.flatMap(r => [r.fatherEmail, r.motherEmail].filter(Boolean) as string[]);
  const existingParents = await fetchExistingParentsByEmails(allEmails);
  const existingByEmail: Record<string, any> = {};
  for (const p of existingParents) {
    existingByEmail[(p.email as string).toLowerCase()] = p;
  }

  const rows: RowPlan[] = [];
  let createParents = 0, updateParents = 0, linkParents = 0, skippedParents = 0, errors = 0;

  inputRows.forEach((row, idx) => {
    const rowErrors: string[] = [];
    // Resolve class
    let classId: string | null | undefined = selectedClassId || null;
    let classNameResolved: string | null | undefined = null;
    if (!selectedClassId) {
      if (row.className && classByName[row.className.toLowerCase().trim()]) {
        classId = classByName[row.className.toLowerCase().trim()].id;
        classNameResolved = classByName[row.className.toLowerCase().trim()].name;
      } else {
        rowErrors.push('Class not found and no class selected');
      }
    } else {
      const c = classes.find(c => c.id === selectedClassId);
      classNameResolved = c?.name || null;
    }

    if (!row.studentName) rowErrors.push('Student name missing');

    // Parents
    const fatherEmail = (row.fatherEmail || '').trim();
    const motherEmail = (row.motherEmail || '').trim();

    let fatherAction: ParentAction;
    if (!fatherEmail) {
      fatherAction = { type: 'skip', reason: 'Father email missing' };
      skippedParents++;
    } else {
      const existing = existingByEmail[fatherEmail.toLowerCase()];
      if (existing) {
        // update if new info (name) available and different
        const desiredName = row.fatherName || existing.name;
        if (desiredName && desiredName !== existing.name) {
          fatherAction = {
            type: 'update-existing',
            parentId: existing.id,
            email: existing.email,
            updates: { name: desiredName },
          };
          updateParents++;
        } else {
          fatherAction = { type: 'link-existing', parentId: existing.id, email: existing.email };
          linkParents++;
        }
      } else {
        const name = row.fatherName || '';
        fatherAction = { type: 'create-new', payload: { name, email: fatherEmail } };
        createParents++;
      }
    }

    let motherAction: ParentAction;
    if (!motherEmail) {
      motherAction = { type: 'skip', reason: 'Mother email missing' };
      skippedParents++;
    } else {
      const existing = existingByEmail[motherEmail.toLowerCase()];
      if (existing) {
        const desiredName = row.motherName || existing.name;
        if (desiredName && desiredName !== existing.name) {
          motherAction = {
            type: 'update-existing',
            parentId: existing.id,
            email: existing.email,
            updates: { name: desiredName },
          };
          updateParents++;
        } else {
          motherAction = { type: 'link-existing', parentId: existing.id, email: existing.email };
          linkParents++;
        }
      } else {
        const name = row.motherName || '';
        motherAction = { type: 'create-new', payload: { name, email: motherEmail } };
        createParents++;
      }
    }

    // Primary: Mother by default if available, else Father if available
    const primaryParent: 'mother' | 'father' | null = motherEmail ? 'mother' : fatherEmail ? 'father' : null;
    if (!primaryParent) rowErrors.push('No valid parent email found');

    errors += rowErrors.length;

    rows.push({
      rowIndex: idx + 1,
      studentName: row.studentName,
      classNameResolved,
      classId,
      father: fatherAction,
      mother: motherAction,
      primaryParent,
      errors: rowErrors,
    });
  });

  return {
    rows,
    stats: {
      students: inputRows.length,
      createParents,
      updateParents,
      linkParents,
      skippedParents,
      errors,
    },
    classes,
  };
};

export const applyFullImport = async (preview: FullImportPreview) => {
  const results: { successes: number; errors: string[] } = { successes: 0, errors: [] };

  // Keep a cache for emails created during apply to reuse IDs
  const emailToParentId: Record<string, string> = {};

  for (const plan of preview.rows) {
    try {
      if (!plan.studentName) {
        results.errors.push(`Row ${plan.rowIndex}: Missing student name`);
        continue;
      }
      if (!plan.classId) {
        results.errors.push(`Row ${plan.rowIndex}: Missing class`);
        continue;
      }

      // Resolve or create/update parents as needed
      const resolveParent = async (
        side: 'father' | 'mother',
        action: ParentAction
      ): Promise<string | null> => {
        if (action.type === 'skip') return null;
        if (action.type === 'link-existing') return action.parentId;
        if (action.type === 'update-existing') {
          const updated = await updateParent(action.parentId, {
            name: action.updates.name || '',
            email: action.email,
          });
          emailToParentId[action.email.toLowerCase()] = updated.id;
          return updated.id;
        }
        if (action.type === 'create-new') {
          const created = await createParent({
            name: action.payload.name || '',
            email: action.payload.email,
            role: 'parent',
          });
          emailToParentId[action.payload.email.toLowerCase()] = created.id;
          return created.id;
        }
        return null;
      };

      const fatherId = await resolveParent('father', plan.father);
      const motherId = await resolveParent('mother', plan.mother);

      // Create student
      const student = await createStudent({
        name: plan.studentName,
        classId: plan.classId!,
        parentIds: [], // we'll add relationships explicitly to control primary + relationship label
      });

      // Link relationships with explicit relationship field
      // Determine primary
      const primary = plan.primaryParent;

      if (motherId) {
        await addStudentToParent(motherId, student.id, 'Mother', primary === 'mother');
      }
      if (fatherId) {
        await addStudentToParent(fatherId, student.id, 'Father', primary === 'father');
      }

      results.successes++;
    } catch (err: any) {
      results.errors.push(`Row ${plan.rowIndex}: ${err.message || 'Failed to import'}`);
    }
  }

  return results;
};
