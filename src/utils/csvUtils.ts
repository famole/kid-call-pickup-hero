
import { Class } from '@/types';

export async function parseCSV<T extends Record<string, any>>(
  file: File, 
  classList?: Class[]
): Promise<{ data: T[], errors: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const errors: string[] = [];
    
    reader.onload = (event) => {
      try {
        const csvText = event.target?.result as string;
        if (!csvText) {
          reject(new Error('Failed to read file'));
          return;
        }
        
        // Split by lines and handle different line endings
        const lines = csvText.split(/\r\n|\n|\r/).filter(line => line.trim());
        
        if (lines.length < 2) {
          reject(new Error('CSV file must contain a header row and at least one data row'));
          return;
        }
        
        // Parse header row to determine column indices
        const header = parseCSVLine(lines[0]);
        const result: T[] = [];
        
        // Process data rows
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          const values = parseCSVLine(lines[i]);
          
          if (values.length !== header.length) {
            errors.push(`Row ${i} has ${values.length} columns, but header has ${header.length} columns`);
            continue;
          }
          
          // Create an object with proper typing to satisfy TypeScript
          const row = {} as Record<string, any>;
          
          // Map values to object properties based on header
          for (let j = 0; j < header.length; j++) {
            const columnName = header[j].trim().toLowerCase();
            let value = values[j].trim();
            
            // Special handling for classId (validate against classList)
            if (columnName === 'classid' && classList && value) {
              const classExists = classList.some(c => c.id === value);
              if (!classExists) {
                errors.push(`Row ${i}: Class ID '${value}' does not exist`);
                continue;
              }
            }
            
            // Special handling for parentIds (split comma-separated string)
            if (columnName === 'parentids' && value) {
              // Handle quoted comma lists and regular comma lists
              if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substring(1, value.length - 1);
              }
              row[header[j]] = value.split(',').map(id => id.trim()).filter(id => id);
            } else {
              row[header[j]] = value;
            }
          }
          
          // Validation
          if ('name' in row && (!row.name || typeof row.name !== 'string')) {
            errors.push(`Row ${i}: Name is required`);
            continue;
          }
          
          if ('classId' in row && !row.classId) {
            errors.push(`Row ${i}: Class ID is required`);
            continue;
          }
          
          // Email validation for parent imports
          if ('email' in row && (!row.email || typeof row.email !== 'string' || !isValidEmail(row.email))) {
            errors.push(`Row ${i}: Valid email is required`);
            continue;
          }
          
          // Convert the record to the expected type
          result.push(row as unknown as T);
        }
        
        resolve({ data: result, errors });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

// Helper function to properly parse CSV line, handling quoted values with commas
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let currentValue = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      // Toggle the inQuotes state
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      // End of current value
      result.push(currentValue);
      currentValue = '';
    } else {
      // Add character to current value
      currentValue += char;
    }
  }
  
  // Add the last value
  result.push(currentValue);
  
  return result;
}

// Helper function to validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

