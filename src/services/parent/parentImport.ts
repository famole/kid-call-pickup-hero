
import { ParentInput } from "@/types/parent";
import { supabase } from "@/integrations/supabase/client";

// CSV import functionality
export const importParentsFromCSV = async (
  parents: ParentInput[]
): Promise<{ success: number; errors: number; errorMessages: string[] }> => {
  const errorMessages: string[] = [];
  let successCount = 0;
  
  for (const parent of parents) {
    try {
      // Mark imported parents as preloaded and needing password setup
      const parentData = {
        name: parent.name,
        email: parent.email,
        phone: parent.phone || null,
        role: parent.role || 'parent',
        is_preloaded: true,
        password_set: false
      };

      // Use secure operations to create parent
      const { secureOperations } = await import('@/services/encryption');
      const { data, error } = await secureOperations.createParentSecure(parentData);

      if (error) {
        throw new Error(error.message);
      }

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
