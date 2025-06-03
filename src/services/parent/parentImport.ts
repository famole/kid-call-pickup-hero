
import { ParentInput } from "@/types/parent";
import { createParent } from "./parentOperations";

// CSV import functionality
export const importParentsFromCSV = async (
  parents: ParentInput[]
): Promise<{ success: number; errors: number; errorMessages: string[] }> => {
  const errorMessages: string[] = [];
  let successCount = 0;
  
  for (const parent of parents) {
    try {
      await createParent(parent);
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
