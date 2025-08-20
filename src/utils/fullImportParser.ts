
export type FullImportRow = {
  className?: string | null;
  studentName: string;
  fatherName?: string | null;
  fatherEmail?: string | null;
  motherName?: string | null;
  motherEmail?: string | null;
};

// Fix UTF-8 double encoding issue where UTF-8 bytes are interpreted as Latin-1
const fixUTF8Encoding = (str: string): string => {
  try {
    // If string contains UTF-8 byte sequences interpreted as Latin-1, fix them
    const bytes = new Uint8Array(str.split('').map(char => char.charCodeAt(0)));
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
  } catch {
    // If decoding fails, return original string
    return str;
  }
};

export const normalizeName = (raw?: string | null): string => {
  if (!raw) return '';
  let value = String(raw).trim();
  if (!value) return '';
  
  // Fix UTF-8 encoding issues
  value = fixUTF8Encoding(value);
  
  // Expected format: "Lastname , firstname"
  const parts = value.split(',');
  if (parts.length === 2) {
    const last = parts[0]?.trim();
    const first = parts[1]?.trim();
    return [first, last].filter(Boolean).join(' ');
  }
  return value;
};

export const parseFullImportFile = async (file: File): Promise<FullImportRow[]> => {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { 
    type: 'array',
    raw: false,
    cellText: true,
    cellHTML: false
  });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { 
    header: 1, 
    defval: '',
    raw: false,
    blankrows: false
  });

  // Expect first row as header. Filter out empty rows and drop header row
  const dataRows = rows.filter(r => (r?.length || 0) > 0 && r.some(cell => String(cell).trim() !== '')) as any[][];
  const dataRowsWithoutHeader = dataRows.slice(1);

  const parsed: FullImportRow[] = dataRowsWithoutHeader.map((r) => {
    const [colClass, colStudent, colFatherName, colFatherEmail, colMotherName, colMotherEmail] = r;
    return {
      className: (colClass ?? '').toString().trim() || null,
      studentName: normalizeName((colStudent ?? '').toString()),
      fatherName: normalizeName((colFatherName ?? '').toString()) || null,
      fatherEmail: (colFatherEmail ?? '').toString().trim() || null,
      motherName: normalizeName((colMotherName ?? '').toString()) || null,
      motherEmail: (colMotherEmail ?? '').toString().trim() || null,
    };
  });

  return parsed;
};
