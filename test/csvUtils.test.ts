import { parseCSV } from '../src/utils/csvUtils';
import type { Class } from '../src/types';
import { describe, expect, test, beforeAll } from 'bun:test';

class SimpleFileReader {
  result: string | null = null;
  onload: ((ev: { target: SimpleFileReader }) => void) | null = null;
  onerror: (() => void) | null = null;

  readAsText(file: File) {
    file.text()
      .then((text) => {
        this.result = text;
        this.onload && this.onload({ target: this });
      })
      .catch(() => {
        this.onerror && this.onerror();
      });
  }
}

beforeAll(() => {
  // @ts-ignore
  globalThis.FileReader = SimpleFileReader;
});

describe('parseCSV', () => {
  const classes: Class[] = [
    { id: 'c1', name: 'Class A', grade: '1', teacher: 'Mr. A' },
    { id: 'c2', name: 'Class B', grade: '2', teacher: 'Ms. B' }
  ];

  test('parses valid CSV', async () => {
    const csv = `name,email,className,parentIds\nJohn Doe,john@example.com,Class A,"p1,p2"`;
    const file = new File([csv], 'students.csv', { type: 'text/csv' });
    const result = await parseCSV<{name:string;email:string;className:string;parentIds:string[]}>(file, classes);
    expect(result.errors.length).toBe(0);
    expect(result.data.length).toBe(1);
    expect(result.data[0].name).toBe('John Doe');
    expect(result.data[0].parentids || result.data[0].parentIds).toBeDefined();
  });

  test('returns errors for invalid rows', async () => {
    const csv = `name,email,className,parentIds\nJane Doe,invalid,Class B,p3`;
    const file = new File([csv], 'students.csv', { type: 'text/csv' });
    const result = await parseCSV<{name:string;email:string;className:string;parentIds:string[]}>(file, classes);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.data.length).toBe(0);
  });
});
