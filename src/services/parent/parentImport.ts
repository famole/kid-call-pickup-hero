
import { ParentInput } from "@/types/parent";
import { supabase } from "@/integrations/supabase/client";

// CSV import functionality
export const importParentsFromCSV = async (
  parents: ParentInput[]
): Promise<{ success: number; errors: number; errorMessages: string[] }> => {
  const errorMessages: string[] = [];
  let successCount = 0;

  // Pre-fetch existing parents by email to detect duplicates
  const { secureOperations } = await import('@/services/encryption');
  const emails = parents.map(p => p.email).filter(Boolean) as string[];
  let existingByEmail: Record<string, boolean> = {};

  if (emails.length > 0) {
    const { data: allParents } = await secureOperations.getParentsSecure(false);
    if (allParents) {
      for (const p of allParents) {
        if (p.email) existingByEmail[p.email.toLowerCase()] = true;
      }
    }
  }
  
  for (const parent of parents) {
    try {
      // Skip if parent with this email already exists
      if (parent.email && existingByEmail[parent.email.toLowerCase()]) {
        errorMessages.push(`Skipped ${parent.name}: email ${parent.email} already exists`);
        continue;
      }

      const parentData = {
        name: parent.name,
        email: parent.email,
        phone: parent.phone || null,
        role: parent.role || 'parent',
        is_preloaded: true,
        password_set: false
      };

      const { data, error } = await secureOperations.createParentSecure(parentData);

      if (error) {
        throw new Error(error.message);
      }

      if (parent.email) existingByEmail[parent.email.toLowerCase()] = true;
      successCount++;
    } catch (error: any) {
      errorMessages.push(`Failed to import ${parent.name}: ${error.message}`);
    }
  }
  
  return {
    success: successCount,
    errors: parents.length - successCount,
    errorMessages,
  };
};
