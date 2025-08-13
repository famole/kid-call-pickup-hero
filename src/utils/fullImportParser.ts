
export type FullImportRow = {
  className?: string | null;
  studentName: string;
  fatherName?: string | null;
  fatherEmail?: string | null;
  motherName?: string | null;
  motherEmail?: string | null;
};

export const normalizeName = (raw?: string | null): string => {
  if (!raw) return '';
  const value = String(raw).trim();
  if (!value) return '';
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
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

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
